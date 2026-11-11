# WarLike Engine — Fondation robuste inspirée de Unity 1.0 (2005)

> Objectif : emprunter les **principes** d'un éditeur 3D utilisable de bout en bout. Aucun code, asset, marque ou composant propriétaire Unity n'est copié.

## Base historique vérifiée

- Juin-juillet 2005 : Unity 1.0.x sur Mac, moteur graphique, physique Novodex, scripts sur environnement .NET, éditeur commercial et jeu GooBall (Game Developer, 14 juillet 2005).
- Août 2005 : Unity **1.1** ajoute la publication Windows, un SDK de plugins C/C++ et améliore les workflows de projets volumineux (Macworld, 22 août 2005). Ces fonctions ne doivent **pas** être attribuées à Unity 1.0.
- Décembre 2005 : Unity **1.2** améliore encore l'éditeur, le rendu et le workflow ; ne pas confondre avec la première sortie.

Sources :
- https://www.gamedeveloper.com/game-platforms/overtheedge-announces-unity-1-0-2-release
- https://www.macworld.com/article/176746/unity-3.html
- https://www.mactech.com/2005/12/24/unity-1-2-3d-game-editor/

## Les invariants WarLike à construire

| Pilier | Garantie attendue | Fichiers & vérifications |
|---|---|---|
| Scene/Game | Même scène, même IDs, pas de perte d'objets à la conversion | `scene-contract.js`, tests de sérialisation |
| GameObject/Component | Transform stable, composants sérialisés, unknown components préservés | `component-definitions.js`, `inspector-model.js` |
| Physique | Sol, Character Controller, collisions et triggers cohérents | `physics-3d.js`, tests de gameplay |
| Prefabs | L'instance n'hérite ni du `parentId` ni des IDs du modèle source ; overrides respectés | `prefab-library.js`, tests de duplication |
| Play | Exécuter le jeu sans modifier définitivement la scène éditée | `runtime-session.js`, tests Play/Stop |
| Sauvegarde | Après une erreur d'écriture ou de lecture, garder la dernière version récupérable | `project-storage-guard.js`, `project-hub.js` |
| Build | Package Web autonome, modèle GLB et textures contenus dans le runtime, erreur explicite si ressource absente | `game-build.js`, tests Chromium |
| Ergonomie | Scene/Hierarchy/Inspector/Project clairs, fonctions avancées non destructrices | `docking.js`, `focus-menu.js` |

### Correctifs implémentés dans ce lot

1. **Prefabs de GameObject unique** : nettoyage des références source `parentId`, `sceneObjectId`, `prefabSourceId`, `prefabOverrides` et métadonnées d'instance. Les anciens prefabs mal enregistrés restent instanciables comme racines indépendantes. Cette mesure ne remplace **pas** un moteur de prefabs imbriqués.
2. **Sauvegarde de projets** : avant de remplacer un snapshot valide, copie de secours dans `warlike.hub.project.<id>.backup.v1`, puis écriture du projet et de l'index. Si l'écriture de l'index échoue, tentative de rollback du projet. Si la sauvegarde principale est endommagée, ouverture depuis la copie de secours avec un avertissement.
3. **Tests** : `tests/project-storage-guard.test.mjs`, `tests/project-hub.test.mjs` et `tests/prefab-library.test.mjs`.

### Limites de sécurité des sauvegardes

- Le backup est **local au même navigateur et au même stockage** ; il ne protège pas contre une suppression de toutes les données de site ou un disque perdu. Pour un backup indépendant, exporter le projet et ses assets.
- En cas de quota de stockage insuffisant, la copie de secours peut échouer. Le moteur tente alors l'écriture et le rollback mais ne peut garantir la récupération lorsque le navigateur refuse **toutes** les écritures.
- Une version antérieure à ce correctif n'a pas nécessairement de copie de secours ; la règle ne reconstitue pas des données qui n'existent plus.
- Les sauvegardes de progression d'un jeu et les projets de l'éditeur sont deux flux distincts. Cette modification concerne le **Hub de projets**.
- Le test automatisé est une exigence de robustesse, pas une preuve d'équivalence graphique, fonctionnelle ou de performance avec Unity.

## Ordre de la prochaine consolidation

**P0** : Play/Stop sans mutations involontaires, données et dépendances GLB, validation scènes historiques, build reproductible.

**P1** : Inspector entièrement typé, prefabs hiérarchiques et variantes, éditeur d'animation rig/IK fiable.

**P2** : ombres et rendu PBR plus complet, profilage, optimisations pour grandes scènes.

Cette feuille de route reste soumise à la règle [WL-COMPAT-001](../AGENTS.md). La compatibilité des anciens projets doit être éprouvée, et non déclarée par défaut.
