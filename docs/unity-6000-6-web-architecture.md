# WarLike Engine et WarLike Editor — architecture Web inspirée d'Unity 6000.6

> Spécification cible, **pas** une certification des fonctionnalités existantes. Mise à jour : 17 novembre 2026. Les deux modules restent **dans le dépôt unique** `Motherlode94/WarLike-Engine`.

## Références officielles

- [UnityEngine 6000.6](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityengine)
- [UnityEditor 6000.6](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityeditor)
- [Unity UI / uGUI](https://docs.unity3d.com/Packages/com.unity.ugui@1.0/manual/index.html) — référence du package, non de toute l'UI Unity 6000.6.

Notre objectif est une **parité de concepts et de workflows dans le navigateur**, pas l'intégration des assemblies Unity, la copie de code/ressources Unity ni la revendication d'une compatibilité binaire.

## 1. Deux modules, un seul dépôt

- **WarLike Engine** = équivalent conceptuel de **UnityEngine** : moteur de jeu Web portable, exécuté en Play **et dans le jeu exporté**. GameObject, Component, Transform, Scene, Rigidbody, Collider, Renderer, Materials, Camera, Light, Animator, Input, Audio, UI de gameplay, scripts, événements et sauvegarde.
- **WarLike Editor** = équivalent conceptuel de **UnityEditor** : application Web de création **non embarquée dans le jeu final**. Hierarchy, Inspector, Scene View, Project Browser, Console, Gizmos, outils d'animation, Prefab Editor, Importers, Build Settings, profils, Profiler, débogueur, WarNode visuel et panneaux dockables.
- **Un seul dépôt GitHub**, une seule gestion de projet/versions/tests et des contrats partagés. La séparation est **modulaire et exécutable**, pas organisationnelle sur GitHub.
- **WarScript** reste un langage de gameplay natif à WarLike, à côté de JS/TS et du C# optionnel. **WarNode** compile vers la logique de runtime, plutôt qu'en créer un second.

### Quelle différence exacte entre UnityEngine et UnityEditor ?

| Domaine | UnityEngine / WarLike Engine | UnityEditor / WarLike Editor |
| --- | --- | --- |
| GameObject | Existe et agit en jeu | Se crée, se sélectionne et se configure |
| Transform | Déplace, oriente et met à l'échelle la géométrie avec parent/enfant | Gizmos, axes Local/World, snapping, édition et Undo/Redo |
| Rigidbody / Collider | Résout simulation et collisions | Edite masses, formes, propriétés et aides visuelles |
| MeshRenderer / Material | Dessine mesh, textures, lumières, animations | Importe et prévisualise ressources ; édite matériaux |
| Animator | Évalue états, clips, transitions et poses | Edite graphe, courbes, IK, retargeting |
| MonoBehaviour / scripts | Exécute le cycle de vie | Fournit Script Studio, Inspector, erreurs, debug |
| UI / Input | Affiche HUD, menus et lit les commandes du jeu | Crée Canvas et composants, édite ancres et événements |
| Scene / Prefab | Charge, instancie et simule | Modifie la scène, édite variantes et overrides |
| Assets | Charge les ressources déjà intégrées | Importe GLB, textures, dépendances, GUID et métadonnées |
| Build | Runtime livré au joueur | Valide et construit le jeu, diagnostique les limites |
| EditorWindow / CustomEditor | **Jamais nécessaire dans le jeu exporté** | Outils destinés uniquement à l'éditeur |

**Règle :** aucun module d'exécution du jeu ne peut importer un module d'édition. L'éditeur dépend des contrats moteur, jamais l'inverse. Les composants UI d'un jeu sont des composants **Engine**, et non des fenêtres Editor.

## 2. Architecture cible interne au dépôt existant

```text
Motherlode94/WarLike-Engine/          (dépôt GitHub unique)
├── js/core/, js/assets/, js/...     moteur et sous-systèmes existants
├── js/ui/, css/, index.html         éditeur Web et interface existants
├── csharp/                           bridge .NET / API C# existante
├── tests/, scripts/                  validations existantes
└── docs/                             documentation commune

Architecture logique à atteindre (refactor incrémental, PAS un déplacement forcé) :
packages/runtime/                      WarLike Engine portable Web
packages/editor/                       WarLike Editor Web
packages/contracts/                    schémas, API, sérialisation, événements
packages/importers/                    pipeline asset à usage éditeur/build
packages/build/                        export des dépendances runtime uniquement
```

La structure `packages/*` est **une organisation cible**, non une description des chemins actuellement présents. Déplacer le code seulement avec migrations, imports corrigés et tests de non-régression. Conserver les liens et projets existants.

```text
WarLike Editor (authoring Web)
    ├─ Scene / Hierarchy / Inspector / Project / Console / WarNode
    ├─ commandes typées + Undo/Redo + asset import + build
    └──────────────┐
                   v
   Contrats partagés : scène versionnée / composants / GUID / événements
                   |
                   v
          WarLike Engine (runtime Web)
    ├─ SceneGraph / Transform / Renderer / Physics / Animator
    ├─ WarScript / JS / TS / UI / Input / Audio / Save
    └─ jeu exporté autonome (sans WarLike Editor)
```

Le **document de scène canonique** contient identifiants stables, parenté, transforms locaux, composants typés, références d'assets, scripts et versions de migration. Play doit cloner l'état d'édition puis Stop doit le restaurer. Editor, Play et build utilisent les mêmes règles moteur : aucune simulation parallèle propre à l'éditeur.

## 3. Contrats techniques non négociables

1. **Transform** : matrices locales et mondiales cohérentes, quaternion, parenté, scale du mesh et du collider selon leur configuration. Préserver les poses affines/shear historiques sans dérive.
2. **Gizmos** : calcul rayon-caméra vers axe/plan de déplacement, pas d'inversion arbitraire des axes ; modes local/global, snapping, pivot, Undo/Redo ; test caméra retournée de 180°.
3. **Component / MonoBehaviour** : cycle d'activation cohérent et ordonnancement défini `Awake → OnEnable → Start → FixedUpdate/Update/LateUpdate → OnDisable → OnDestroy` selon circonstances ; ne pas faire exécuter les callbacks d'un composant désactivé.
4. **Physics** : une autorité sur Rigidbody, Collider, CharacterController et contacts ; comparer Play, Editor et export.
5. **Rendering** : un pipeline de mesh/material/texture et de skinning partagé entre Scene, Game, Library previews quand applicable, et build ; signaler explicitement toute extension glTF non supportée.
6. **Animator** : clip réel, rig, blending, transitions, IK/root motion seulement là où implémentés et testés ; WarNode agit sur le même contrôleur.
7. **Scripting** : mêmes capacités gameplay documentées entre WarScript/JS/TS/C#, exceptions explicites ; isolation des scripts tiers non fiables ; permissions et stockage protégés.
8. **C#** : le pont natif .NET 8 existant ne rend pas le C# automatiquement portable ; **un script C# natif actif bloque aujourd'hui l'export Web**. Toute solution WASM ou transpilation doit être développée et testée avant de déclarer la compatibilité.
9. **UI** : panneaux Editor en HTML/CSS accessibles et dockables ; UI des jeux en composants Engine (Canvas, ancres, événements, texte, HUD) conservés en export.
10. **Build** : runtime + assets + scripts compatibles + sauvegardes, sans outils de l'éditeur, sans réseau externe imposé et avec rapport clair des limitations.

## 4. Carte des API à suivre (priorités)

| UnityEngine de référence | API WarLike Engine à viser |
| --- | --- |
| Object, GameObject, Component, Behaviour, MonoBehaviour | création, destruction, activation, recherche, callbacks |
| Transform, Quaternion, Vector2/3, Matrix4x4 | hiérarchie, matrices, repères local/world, scale |
| SceneManagement | ouverture/chargement asynchrone, activation, transitions |
| Mesh, MeshFilter, MeshRenderer, Material, Shader, Camera, Light | rendu 2D/3D, matériaux, textures, éclairage |
| Rigidbody, Collider, Physics, CharacterController | corps rigides, requêtes physiques, mouvements joueurs |
| Animator, AnimationClip, Avatar | états, paramètres, skinning, root motion, retargeting |
| Input, EventSystems, Canvas, UI | entrées et HUD runtime |
| AudioSource, AudioListener, AudioMixer | effets, spatialisations, mixage |
| Time, Debug, Resources | horloges, logs, dépendances/asset loading |

| UnityEditor de référence | WarLike Editor à viser |
| --- | --- |
| EditorWindow / Editor / SerializedObject | fenêtres, Inspector typé, transactions |
| SceneView / Handles / EditorTool | édition précise, gizmos et picking |
| Undo / Selection | historique des modifications et sélection |
| AssetDatabase / AssetImporter | import durable, GUID, dépendances |
| PrefabUtility / PrefabStage | prefabs, variants, overrides |
| AnimationWindow / AnimatorController | éditeurs animation et graphes |
| BuildPipeline / BuildPlayerOptions | export Web autonome et diagnostics |
| EditorApplication / PlayModeStateChange | Play/Pause/Stop et restauration |
| Profiler / Console | mesures, erreurs, breakpoints |

Les noms Unity servent de **référence de conception**, pas de promesse d'API strictement identique.

## 5. État actuel à ne pas masquer

- `js/core/scene-graph-v2.js` fournit déjà une gestion hiérarchique/affine Web, mais `csharp/WarLike.Runtime/MonoBehaviour.cs` n'expose pas encore la même hiérarchie Transform.
- `js/core/viewport-3d.js`, `js/core/gizmos-3d.js` et `js/core/rapier-physics-3d.js` existent ; vérifier intégration réelle et bugs de gizmos/scale en navigateur.
- `docs/imported-assets-and-export.md` atteste des matériaux GLB améliorés, **pas d'un PBR glTF complet**.
- `docs/animation-studio.md` décrit l'Animator et WarNode ; vérifier chaque fonction sur assets Meshy réellement riggés, scènes et builds.
- `docs/script-languages.md` et `docs/runtime-acceptance.md` décrivent l'export Web de WarScript/JS/TS et les limites C# ; ne pas inventer de compatibilité native totale.

## 6. Ordre de réalisation et preuves exigées

**P0 — Fiabiliser les bases :** SceneGraph, Transform, gizmos, scale rendu/collider, Hiérarchie, Inspector, Undo/Redo, conservation des projets.

**P1 — Éditeur et simulation :** Rigidbody/Collider/CharacterController, Scene/Game/Play, UI runtime/editor séparées, import et matériaux GLB, outils d'animation.

**P2 — Gameplay :** WarScript/JS/TS/C#, WarNode typé et débogable, Animator (IK, root motion), Prefab variants, scènes RTS/FPS éditables.

**P3 — Production :** build Web autonome, profiler, import fiable depuis Library/Meshy, documentation API, benchmarks et validation multi-navigateurs/GPU.

### Matrice minimale de tests d'acceptation

- Gauche à l'écran = mouvement intuitif avec toutes orientations caméra et axes configurés.
- Scale 2× = mesh visuel 2× ; Collider suit les règles de son composant ; enregistrement/rechargement identiques.
- Parent rotatif/scale non uniforme = child correct ; Undo et recharge sans perte.
- Rigidbody + Collider = même comportement dans Play et export, selon déterminisme/plateforme documentés.
- GLB humain/véhicule/bâtiment = matériaux, rig/clips et proportions cohérents dans Scene/Game/export.
- Scripts désactivés = aucune mise à jour ; cycles de vie testés lors des transitions.
- Un soldat RTS contrôlable en FPS = même identité GameObject, état, animations et collisions.
- Export = aucune dépendance de l'Editor et aucun C# actif non compatible ; message d'erreur explicite.
- Ouvrir des projets anciens ne détruit jamais assets, scripts, sauvegardes ou disposition utilisateur.
- Tests `npm test`, `npm run typecheck`, `npm run test:export` et scénarios Chromium exécutés et rapportés ; ne jamais annoncer « validé » sans exécution.

## 7. Documentation et maintenance

- Chaque nouvelle API Engine a un exemple de gameplay, des contraintes d'export et un test.
- Chaque outil Editor indique les données qu'il modifie, l'Undo, la sérialisation et le comportement en Play.
- Les tableaux de parité distinguent **implémenté**, **testé**, **partiel**, **absent** et **objectif** avec preuves datées.
- Ne pas créer une seconde base de code `WarLike Editor` concurrente : appliquer la séparation au dépôt unique.
- Conserver et respecter `AGENTS.md`, `PROPRIETARY.md`, `THIRD_PARTY_NOTICES.md` et les licences des dépendances.
