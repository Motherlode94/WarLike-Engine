# Architecture WarLike Engine + WarLike Editor — un seul dépôt

**Spécification active (17 novembre 2026)** — Conception inspirée de [UnityEngine 6000.6](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityengine) et [UnityEditor 6000.6](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityeditor), adaptées au navigateur. Voir le [référentiel complet](docs/unity-6000-6-web-architecture.md).

## Frontière entre les modules

- **WarLike Engine (runtime)** : scène canonique, GameObject/Component, Transform, moteur de rendu, physique, animation, scripts, input, audio, UI du joueur, sauvegardes. **Inclus dans Play et export.**
- **WarLike Editor (authoring)** : Scene View, Hierarchy, Inspector, Project Browser, importeurs, gizmos, Timeline/Animator Editor, WarNode visuel, Console, débogueur, build, panneaux dockables. **Exclu du jeu exporté.**
- **Contrats communs** : modèles de données versionnés, composants typés, identifiants stables, commandes/Undo, sérialisation, API gameplay. **L'Editor peut dépendre de l'Engine ; l'Engine ne doit pas importer l'Editor.**
- **Dépôt GitHub** : `Motherlode94/WarLike-Engine`, sans nouveau dépôt pour WarLike Editor.

## Chemins existants à préserver

| Chemin | Rôle constaté |
| --- | --- |
| `index.html`, `css/`, `js/ui/` | Application et interface de création, panneaux |
| `js/editor.js`, `js/core/state.js`, `js/core/input.js` | Entrée de l'éditeur, état et commandes |
| `js/core/scene.js`, `js/core/scene-graph-v2.js` | Structures de scène ; unification à poursuivre |
| `js/core/viewport-3d.js`, `js/core/gizmos-3d.js` | Vue 3D et outils de manipulation |
| `js/core/rapier-physics-3d.js`, `js/assets/real-models-3d.js` | Physique et ressources GLB |
| `csharp/` | C# natif et bridge local ; non portable tel quel en export Web |
| `tests/`, `scripts/` | Vérifications et outils de build |
| `docs/` | Références techniques et limitations |

La réorganisation future éventuelle en `packages/runtime`, `packages/editor` et `packages/contracts` constitue **une cible**, pas la structure actuelle. Éviter toute migration massive sans plan de compatibilité et tests.

## Priorités structurelles

1. Corriger le mouvement des gizmos et le lien Transform / géométrie / Collider / hiérarchie.
2. Unifier document de scène, Play/Stop, Inspector, historique et sérialisation.
3. Séparer sans ambiguïté les dépendances Editor des dépendances Engine au build.
4. Renforcer le rendu des GLB, Animator, physique et WarNode contre les vrais projets.
5. Fournir des diagnostics clairs pour les fonctions non exportables, notamment C# natif.
6. Conserver les anciens projets et appliquer les règles de `AGENTS.md`.

## Validation

Exécuter et documenter au minimum `npm test`, `npm run typecheck`, `npm run test:export` et les scénarios navigateur pertinents. Une fonctionnalité présente dans le code n'est pas considérée comme validée par cette seule présence. Voir `docs/runtime-acceptance.md`.

## Historique

L'ancienne description **V0.3** ci-dessous est conservée comme référence historique, **pas comme architecture actuelle**.

---

# Architecture WarLike Engine — V0.3 (modularisation)
- `index.html` : document HTML et points d'ancrage des panneaux
- `css/style.css` : styles et responsive
- `js/editor.js` : point d'entrée sans logique métier
- `js/core/state.js` : état central de la scène
- `js/core/camera.js` : transformations écran/monde, zoom, recentrage
- `js/core/history.js` : snapshots undo/redo bornés à 80 étapes, **mémoire de session seulement**
- `js/core/scene.js` : entités, Play/Stop, JSON import/export
- `js/core/input.js` : pointeur, sélection multiple, raccourcis clavier
- `js/core/renderer.js` : rendu 2D Canvas et jeu de démonstration
- `js/ui/inspector.js` : hiérarchie et édition des propriétés
- `types/engine.ts` : interfaces TS préparatoires (non exécutées)
- `vendor/phaser/` : code source original Phaser et licence MIT (un utilitaire uniquement pour le moment)

## Tester
Cloudflare Pages sert le dossier racine sans compilation. Le serveur doit gérer les modules ES (`type="module"`). Lors du déploiement, vérifier que `js/editor.js` et les imports relatifs renvoient HTTP 200.

## Points à compléter
Moteur Phaser complet, tests automatiques navigateur, sauvegarde cloud, assemblage des composants, TileMap, scripting et migration TypeScript avec build. Le prototype actuel ne prétend pas encore offrir ces éléments.
