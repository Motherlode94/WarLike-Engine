# P0 — WarLike World Builder + Gaia

**Priorité active : Road Editor natif 2D/3D relié à Gaia, puis City Builder.**

Suivi : [Issue #159](https://github.com/Motherlode94/WarLike-Engine/issues/159).

## Architecture — pas de second moteur de terrain

Le World Builder est un outil du WarLike Editor existant, pas un projet externe.

- Réutiliser le terrain Gaia : `terrainHeightfield`, `heightfieldAt3d`, `applyTerrainBrush`, `terrainSurfaceMesh3d` et la révision `terrainRevision3d`.
- Préserver le schéma `warlike.terrain.heightfield.v1` et l'import des mondes `warlike.gaia.world.v1`.
- Les coordonnées d'édition sont métriques ; convertir explicitement les unités scène (64 unités par mètre) dans les adaptations.
- Les routes sont des assets/objets de scène persistant, pas de simples textures ; elles disposent d'une géométrie roulable, collision et données de navigation propres.
- Le module route peut proposer un nivellement/terrassement local sous l'emprise et les accotements, sans modifier le relief hors de cette zone. L'utilisateur peut prévisualiser et annuler.

## Ordre de livraison

| Rang | Étape | Résultat fonctionnel attendu |
| --- | --- | --- |
| P0.1 | Road Editor et Gaia | Tracer/modifier des splines sur un terrain existant, produire le mesh routier, ajuster localement le relief, Undo/Redo, sauvegarder |
| P0.2 | Intersections et voies | Relier plusieurs routes, produire une surface sans discontinuité et un graphe de circulation orienté |
| P0.3 | City Builder | Parcelles et quartiers à partir des voies, vrais prefabs Library / Store, placement respectant pente/collisions |
| P1 | Monde étendu | Chargement par secteurs, budgets de performance et outils de création de grands mondes |
| P0 qualité | Certification | Même relief, routes, collisions et circulation en Scene, Play, après réouverture et dans l'export Web |

## Tests bloquants
1. Une route suit une pente Gaia, puis son nivellement modifie uniquement l'emprise sélectionnée.
2. Undo/Redo retrouve les échantillons de heightfield et la route d'origine.
3. La géométrie et la collision correspondent : un véhicule réel peut rouler, tourner et freiner.
4. Un projet sauvegardé/réouvert restitue les points de contrôle, le relief, les matériaux et les voies.
5. L'export Web reproduit le trajet et le comportement collision/physique.
6. Aucun menu sans fonctionnalité active ; aucune fusion avec CI rouge.

Les correctifs véhicules en cours restent indépendants. La première PR d'implémentation devra livrer une route réellement traçable et enregistrable plutôt qu'un catalogue de boutons.
