# WarLike Engine — P0 → P4 : contrat de livraison Component (Unity 6000.6)
Documentation de référence : https://docs.unity.com/en-us/engine/6000.6

## P0 — Architecture Component
- Un GameObject possède des **composants de comportement/données** ; ce n'est ni un Asset, ni un Prefab.
- Le registre `js/core/component-registry.js` accepte des manifests de composants d'extension, avec identifiant stable, modes compatibles, valeurs initiales JSON copiables, schéma de propriétés et catégorie.
- `registerWarLikeComponent` refuse d'écraser l'identifiant d'un composant natif.
- `Add Component`, l'Inspector générique, Ajouter, Réinitialiser et Supprimer lisent le registre commun.
- Les composants inconnus d'un projet ancien ne sont pas effacés. Ajouter un composant ne modifie aucun prefab source.
- **Non livré** : migration générale de tous les anciens formats de composants vers une structure unique ; l'existant conserve ses champs historiques pour la rétrocompatibilité.

## P1 — Physique 2D/3D
- Correctif de dépendance : un Joint2D ou Effector2D bloque la suppression du Collider2D dont il dépend.
- Correctif de régression : supprimer Collider2D ne désactive pas `collision3d` par erreur.
- **À développer/valider** : Collider par forme indépendante, callbacks collision/trigger et filtrage par couches, Physics Materials avancés, contraintes articulées, tests Play Rapier et export Web complets.

## P2 — Gameplay modulaire
- **Existant, à certifier** : `controller2d`, `controller3d`, `cameraRig`, `ai`, `stats`, `inventory`, `VehicleController` natif/portable selon le contexte.
- **À développer** : `AnimalController` véritable, contrôles de locomotion et animation quadrupède, suspension/roues, Player Input indépendant, interactions génériques en réseau et export.

## P3 — Animation / Navigation
- **Existant, à certifier** : `animatorGraph`, `spriteAnimation2d`, `ai`, `tacticalUnit` et des modules rig/IK.
- **À développer/valider** : contrôle des Avatar humanoïdes, retargeting, masques et couches exécutés, Root Motion, IK complet, NavMesh et nav agents réutilisables, persistance et export.

## P4 — Écosystème extensible
- Première fondation : manifeste enregistrable à l'exécution dans le registre JavaScript, sans modifier le catalogue noyau.
- Les données initiales de l'extension sont enregistrées dans l'objet et éditées par l'Inspector générique.
- **Important** : l'inscription au catalogue ne connecte PAS automatiquement la simulation. Le menu affiche « données seules » ; la vérification de compatibilité refuse l'export tant que l'extension n'a pas de runtime certifié.
- **À développer** : chargement de packages signés/versionnés, API de runtime Play/Web avec cycle de vie et sandbox, export bundling, propriétés typées étendues (entity refs, assets, arrays), permissions et validation multi-navigateurs.

## Quality gates : ne pas fusionner sans preuves
1. Exécuter `node --test tests/component-registry.test.mjs` et la suite `npm test` ; CI verte.
2. Ouvrir un ancien projet 2D et 3D et vérifier les nombres d'objets, assets et comportements inchangés (WL-COMPAT-001).
3. Ajouter/réinitialiser/supprimer des composants et tester Undo/Redo et sauvegarde/rechargement.
4. Démontrer un composant réellement exécutable dans Play avec un test de comportement (pas seulement le menu).
5. Exporter un projet Web et vérifier les erreurs explicites pour les composants sans runtime.
6. Vérifier le rendu Inspector et les interactions avec des composants personnalisés sur Chrome/Edge/Firefox.

Statut de ce lot : **fondation P0/P4 + garde physique P1, non certifiée**. Aucune prétention de complétude P1/P2/P3/P4.
