# WarLike Engine vs Unity 6 — audit d’écarts techniques (11 novembre 2026)

Périmètre : comparaison des capacités de l’éditeur web et des runtimes WarLike avec les concepts documentés dans Unity 6, **pas** une déclaration de parité. Une fonction présente dans le code n’est pas nécessairement fiable en production. Respecter [WL-COMPAT-001](../AGENTS.md) lors de chaque correction.

Références Unity :
- [GameObjects et composants](https://docs.unity.com/en-us/engine/6000.3/manual/working-with-gameobjects/unity-components/components)
- [Inspector et actions sur les composants](https://docs.unity.com/en-us/engine/6000.3/manual/working-with-gameobjects/unity-components/using-components)
- [Transforms](https://docs.unity.com/en-us/engine/6000.0/manual/working-with-gameobjects/gameobject-fundamentals/class-transform)
- [Prefabs, variantes et instances](https://docs.unity.com/en-us/engine/6000.6/manual/working-with-gameobjects/prefabs)

## Différences et priorités

| Domaine | Éléments WarLike observés | Écart à Unity | Priorité | Validation |
|---|---|---|---|---|
| Hierarchy / Scene Graph | `scene-graph-v2.js` : parents, matrices, Keep World ; `scene-contract.js` : scène canonique | Vérifier sélection précise GLB, undo/redo des hiérarchies et tous les outils de placement | P0 | tests de manipulations sur objets imbriqués |
| Inspector | `component-definitions.js`, `component-browser.js`, `inspector-model.js` | Le sélecteur d’ajout masquait les composants métiers déjà enregistrés ; édition typée et références d’objets non universelles | P0 | recherche/add/remove de chaque composant par mode |
| Moteur 3D / matériaux | Rendu GLB, assets importables, MeshRenderer | Cohérence matériaux/textures, meshes blancs et contrôle des ombres à confirmer | P0 | matrice GLB/GLTF, textures et export |
| Physique | `collider-3d.js`, `physics-3d.js`, `gameplay-components.js` | Colliders par mesh, joints et comportement FPS à tester dans des scènes réelles | P0 | chute, rampes, plateformes, rigidbodies, joints |
| Export | `scene.js`, export du jeu, `runtime-capabilities.js` | Portabilité JS/WarScript/C# et assets sans dépendance à l’éditeur non démontrée pour tous les projets | P0 | jeu exporté complet en HTTP indépendant |
| Prefabs | `prefab-library.js`, `inspector-prefabs.js` : instances, overrides, propagation | Pas de système complet de nested prefabs/variants et héritage multi-niveaux de type Unity | P1 | create/instantiate/apply/revert/variant/nested |
| Animation | Animator Graph, clips, IK partielle, rig Studio | Retargeting, root motion et transitions avancées incomplets | P1 | personnage riggé avec changement d’animation |
| Scripting | JS/TS, WarScript, C# local .NET 8 | C# natif local ≠ runtime universel sur Web ; vérifier cycle Awake/Start/Update et API de composants | P1 | même scène Web et natif, matrice de compatibilité |
| Éditeur / disposition | Menu compact, docking, Inspector, Project Browser | Densité, cohérence des raccourcis et stabilité avec anciens layouts | P1 | anciens projets 2D et 3D, restauration |
| Terrain et outils | Primitive terrains et prototypes | Outils terrain, layers, bruit/érosion et streaming de grands mondes incomplets | P2 | large carte + sauvegarde + performance |
| Profilage et builds | Quelques diagnostics et scripts de validation | Manque d’expérience équivalente aux Profiler/Build Profiles et rapports systématiques | P2 | benchmark CPU/GPU/mémoire/export |

## Corrections de ce lot

1. **Inspector — Add Component** : toutes les définitions enregistrées compatibles avec le workspace sont proposées, avec catégorie, recherche et indication du runtime. Les composants ne sont pas créés avant le clic de l’utilisateur. Fichier : `js/ui/component-browser.js`.
2. **Prefabs — suppression propagée** : un composant supprimé dans le prefab source est retiré des autres instances non surchargées, sans effacer l’override explicite, la position ou une propriété d’ancien projet inconnue. Fichier : `js/core/prefab-library.js`.
3. **Régression** : `tests/component-picker-parity.test.mjs` et `tests/prefab-library.test.mjs`.

## Critères de finition (avant de dire « parité Unity »)

- L’Inspector doit montrer les composants ajoutés avec leurs propriétés modifiables. Le catalogue seul ne valide pas cette étape.
- Un prefab doit fonctionner dans des scènes complexes, incluant la hiérarchie des enfants et des variantes ; la suppression propagée ne constitue pas un système de variantes complet.
- Tester la physique, le rendu, les scripts et les sauvegardes dans des scènes 2D et 3D ouvertes depuis d'anciens projets.
- Valider le comportement dans Chrome/Edge/Firefox et sur un build exporté. Les essais en navigateur réel n’ont **pas** été réalisés dans ce lot.
- Les écarts non résolus restent **À développer/À valider**, et ne sont pas étiquetés « corrigés ».

## Ordre de rattrapage recommandé

**P0 :** tests Play/export intégrés → pipeline assets GLB/matériaux → collisions/contrôleur 3D → cohérence Inspector ↔ runtime.
**P1 :** prefabs hiérarchiques/variantes → Animator complet → C# API et migration contrôlée.
**P2 :** outils terrain avancés → profilage → pipelines builds et automatisation.

## Lot de rattrapage : pipeline de jeu 3D exporté (11 novembre 2026)

- `js/core/game-build.js` : récupération non destructive d'une ancienne scène de démarrage uniquement lorsqu'il ne reste qu'une scène. Si plusieurs scènes existent, le build échoue avec une erreur explicite au lieu de choisir la mauvaise.
- `tests/chambre-07-export-readiness.test.mjs` : vérifie que les données de CHAMBRE 07 sont présentes dans la définition de build, que les objets de scène ne sont pas mutés et que la scène de démarrage est cohérente.
- `scripts/test-chambre07-export-browser.mjs` : export ZIP réel, hébergement statique isolé, démarrage Play sous Chromium, contrôles des modèles, des entités, du sol, des erreurs WebGL et des fichiers manquants ; capture de test.
- `scripts/check-chambre07-runtime-manifest.mjs` : vérifie la présence des modules requis dans le manifest.
- `.github/workflows/engine-integrity.yml` : reconstruit le manifest, vérifie types/tests/export puis lance un smoke test Playwright en navigateur.
- `package.json` : commandes `npm run test:chambre07:export` et `npm run test:chambre07:browser`.

**Statut réel :** code et contrôle automatique enregistrés ; aucune exécution CI complète ni capture WebGL finale confirmée pendant cette intervention. Un « smoke test » de lancement ne prouve pas encore la jouabilité complète des trois souvenirs et des deux fins. Ces parcours et l'export depuis d'anciens projets restent à valider séparément.

