# WarLike Engine — Unity Feeling : contrat de livraison

Ce plan est un **contrat de certification**, pas une affirmation de parité avec Unity.
Aucune phase n'est terminée avant les essais dans l'éditeur Web et le jeu exporté.

## P0 — Bloquants de création

| Domaine | Critère de sortie |
| --- | --- |
| Scene / sélection | Clic et multi-sélection déterministes ; sélection vide respectée après Undo/Redo ; cadrage F de l'objet ; navigation caméra Scene séparée de Game |
| Transform / Gizmos | Déplacer X vers la gauche de l'écran déplace l'objet dans la direction de la poignée ; axes Local/Global, rotation, échelle et snapping sans mouvement parasite ; parent/enfant cohérents |
| Rendu et collision | Une modification de taille affecte le mesh réel et sa boîte de sélection ; collider automatique cohérent ; override explicite du collider préservé |
| Inspector | GameObject, Transform, composants et Add Component dans un panneau ; valeurs éditables enregistrées ; aucun menu inutile n'occupe la vue |
| Play/Stop | Snapshot avant scripts ; reprise exacte de scène, sélection, NextId, projet, caméra et Undo/Redo après Stop ou erreur ; Play n'enregistre pas de modifications d'édition |
| Tests obligatoires | 2D, 3D, plusieurs objets, scène hiérarchique GLB, deux sessions Play, Stop après script en erreur et sauvegarde après Stop |

## P1 — Flux de création

| Domaine | Critère de sortie |
| --- | --- |
| WarScript / WarNode / C# | Ajout de script, propriétés Inspector, erreur avec emplacement, diagnostic lisible, breakpoint réellement testé selon backend |
| Prefabs / DnD | Glisser d'un asset vers Scene/Hierarchy ; instance persistante ; overrides, revert, Undo/Redo |
| Graphismes / Animator / physique | Matériaux GLB conservés, animation jouée en Play, Rigidbody/Collider en 2D/3D, propriétés modifiées persistantes |
| Export | Comparaison scène d'origine/jeu Web autonome : mêmes scripts, matériaux, animations, collisions, entrées et assets sans réseau |

## P2 — Productivité avancée

Outils de terrain, placement d'objets, navigation/IA et templates de genres. L'extension s'appuie sur les composants natifs, pas sur des démos autonomes en dehors du moteur.

## Certification reproductible

1. Charger `tests/fixtures/phase1-transform-gizmos.scene.json` et déplacer chaque axe de face et de dos ; tourner, scaler, enregistrer, rouvrir.
2. Charger `tests/fixtures/phase2-physics-2d.scene.json` : collisions, Trigger2D, masques de collision, Play/Stop.
3. Charger `tests/fixtures/phase2-physics-fps-tps.scene.json` : gravité, rampe, escaliers, caméra souris sans maintien du clic, orientation TPS, aim/tir.
4. Vérifier Undo/Redo avec **aucune sélection**, sélection multiple et après suppression d'objets.
5. Tester en panneau Inspector étroit/large avec thèmes existants ; ne pas modifier les tokens globaux.
6. Exporter et ouvrir les archives extraites, idéalement sans réseau : contrôler assets et comportement.
7. Exécuter les tests Node du dépôt et les contrôles de build ; ne pas annoncer réussite sans les exécuter.

## État au 18 novembre 2026

- Inspector CSS : PR #92 (statut à confirmer sur GitHub).
- Gizmos / snapping : PR #93 en revue.
- Caméra souris Game : PR #94 en revue.
- Sélection vide conservée par Undo/Redo : modification de cette branche.
- Les vérifications WebGL, export et performances restent à effectuer.
