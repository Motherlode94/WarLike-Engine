# Certification WarLike Engine — Phases 1 et 2

Deux fichiers de scènes **importables par l'éditeur** servent de scénarios reproductibles. Ce sont des données Engine natives (`version:5`, `entities`), pas des captures ni des maquettes :

- `tests/fixtures/phase1-transform-gizmos.scene.json` : sol, trois niveaux de hiérarchie, GLB KayKit CC0 intégrés au dépôt, Collider3D à taille automatique, surface inclinée et cible de placement sans snapping.
- `tests/fixtures/phase2-physics-fps-tps.scene.json` : joueur FPS/TPS, sol physique, mur, rampe, marches basse/haute, plateforme cinématique et caisse GLB saisissable via `grab3d` plus caisse témoin.
- `tests/fixtures/phase2-physics-2d.scene.json` : joueur top-down, mur autorisé, Trigger2D autorisé, Trigger2D masqué et objet décoratif sans collider.

## Exécution manuelle dans l'éditeur

1. Ouvrir WarLike Engine et utiliser **Importer une scène** (ne pas importer comme plugin WarNode ou projet V2).
2. Charger le fichier Phase 1 et passer en espace 3D : déplacer les poignées X/Y/Z vues de face puis de dos ; tourner, scaler le GLB et contrôler les colliders.
3. Déplacer le parent et vérifier que l'enfant et le petit-enfant conservent leurs positions locales. Vérifier Undo/Redo et sauvegarder, fermer puis restaurer.
4. Charger Phase 2 : se déplacer sur le sol, la rampe et les marches ; contrôler l'absence de traversée des murs ; tester la plateforme mobile en la déplaçant.
5. En Play FPS/TPS, viser la caisse dynamique et essayer **G** saisir, **G** déposer, **T** lancer. La caisse témoin ne doit pas être saisissable. Les commandes utilisent la caméra du joueur.
6. Charger Phase 2 en 2D : vérifier la collision avec le mur, l'activation unique du Trigger2D autorisé et l'absence de contact avec le trigger masqué.
7. Exporter chaque scène en Web autonome et répéter les essais dans l'archive réellement extraite, sans ressources distantes.

## Critères de sortie

La phase 1 n'est certifiée que si Translate/Rotate/Scale, hiérarchie, snapping, géométrie GLB et Collider3D sont concordants avant/après Save et Play/Stop. La phase 2 n'est certifiée que si FPS/TPS, gravité, marche, pentes, contacts, plateforme cinématique, Grab/Drop/Throw et export restent cohérents sans erreurs de console ou ressources manquantes.

`tests/phase1-phase2-certification-scenes.test.mjs` vérifie les invariants structurels des deux scènes, leurs GLB locaux, la hiérarchie et leurs composants physiques. **Les tests unitaires ne remplacent pas un essai visuel en navigateur.** Une simple plateforme marquée `kinematic` n'est pas automatiquement une plateforme animée : pour éprouver son transport, déplacer effectivement cet objet pendant Play ou utiliser le test Rapier existant.

Pour les collisions 2D et leurs layers/masks, le complément automatisé est `tests/physics-contact-events-2d.test.mjs` ; il reste à effectuer le scénario Play/Export 2D visuellement.
