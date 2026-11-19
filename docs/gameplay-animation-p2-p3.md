# WarLike Engine — P2/P3 : Gameplay et animation modulaires

Ce lot est une évolution **du moteur** et de ses composants, pas la création de Prefabs. Références : Unity Engine 6000.6, documentation Component / Character Controller / Animator et navigation.

## P2 — Components indépendants

| Component | Type | Comportement Play Web | Inspector | Limites |
| --- | --- | --- | --- | --- |
| `inputActions` | commandes | remappe les touches clavier des contrôleurs Player 2D/3D et véhicules 2D/3D | éditeur générique | pas de système de rebinding manette ni actions contextuelles complètes |
| `animalController` | faune | locomotion autonome, errance/fuite déterministe et contacts des colliders 2D/3D | éditeur générique | pas de quadrupède procédural ou NavMesh ; ne concurrence pas `ai` ni `navigationAgent` |
| `vehicleController` | conduite | un simple GameObject peut devenir un véhicule arcade 2D/3D, sans prefab, avec vitesse et conduite configurables | éditeur générique | pas de Wheel Collider, suspension, pneus ou simulation de transmission réaliste |
| `controller2d`, `controller3d` | personnage | contrôleurs préexistants, désormais alimentés par `inputActions` | Inspector spécialisé | validation terrain/physique/export encore requise |

### Input Actions
- Chaque GameObject peut disposer de `inputActions`. Les mappings sont des listes de touches en minuscules séparées par des virgules : `forward: "i,arrowup"`.
- `replaceDefaults:false` ajoute les touches sélectionnées aux anciennes commandes ; `replaceDefaults:true` remplace les raccourcis du contrôleur concerné.
- Les entrées physiques de l'utilisateur ne sont pas modifiées globalement ; les scripts et autres objets conservent leurs propres touches.
- Le composant ne crée pas de caméra, mesh, joueur, animal ou véhicule.

### Animal Controller
- `behavior` : `idle`, `wander` ou `flee`.
- `targetId` indique l'objet à fuir ; distances, vitesse et repos sont configurables.
- Le déplacement appelle `moveBody2d` ou `moveBody3d`, donc respecte les obstacles selon les colliders existants.
- Les valeurs `animatorParameters.animalSpeed`, `animalMoving` et `animalFleeing` sont exposées à l'Animator et la propriété `animation` choisit des noms de clips configurables. Un modèle sans rig/clip n'est pas animé par magie.

### Vehicle Controller
- Compatible avec `stepArcadeVehicle` existant : `maxSpeed`, `acceleration`, `brakeForce`, `turnRate`, `drag`, `reverseRatio`.
- L'attachement de ce composant à un GameObject autorise la conduite 2D/3D sans dépendre de la catégorie Asset ni d'un Prefab existant.
- Les composants désactivés ne doivent pas autoriser la conduite.
- Ne pas annoncer de physique WheelCollider tant qu'elle n'est pas livrée/testée.

## P3 — Animation et navigation

- `navigationAgent` : waypoints `{x,y}` éditables dans l'Inspector, cible `targetId`, rayon d'arrêt, vitesse et boucle.
- Les Agents déplacent des objets réels avec les solvers de collision 2D/3D et exposent `navigationMoving` / `navigationSpeed` à l'Animator.
- Pour éviter plusieurs systèmes de déplacement concurrents : les entités dotées d'une IA combat active n'utilisent pas le nouveau Navigation Agent ; un animal doté d'un Navigation Agent laisse celui-ci diriger son déplacement.
- L'Avatar humanoïde, le retargeting, les couches de masques, Root Motion et l'IK sont déjà implémentés **partiellement** dans les modules `humanoid-avatar.js`, `skeletal-animation.js`, `animator-graph.js`. Ils ne sont pas remplacés par ce lot et nécessitent encore certification sur rigs réels et Web export.
- La navigation par waypoints est **locale**, sans NavMesh, baking ni recherche A* intégrée à ce nouveau composant. Le moteur conserve ses autres systèmes de pathfinding.

## Persistence / export
- `scene-contract.js` inscrit les quatre nouveaux composants dans la scène canonique, tout en conservant le `LegacyEntity` complet.
- Le `player-modules.js` inclut les quatre nouveaux modules dans le graphe de modules du joueur exporté.
- `runtime-capabilities.js` signale les configurations de composants invalides avant l'export.
- Conserver les comportements de projets historiques lorsqu'aucun nouveau composant n'est attaché (WL-COMPAT-001).

## Quality gates avant fusion
1. Exécuter `node --test tests/modular-gameplay-animation.test.mjs` puis `npm test`.
2. Regénérer les manifests avec `npm run build:runtime` et vérifier l'absence de modifications inattendues.
3. Ouvrir une scène 2D et une scène 3D **anciennes** et vérifier les contrôles legacy.
4. Tester réellement un joueur avec Input Actions, un animal qui erre/fuit et un véhicule créé sur GameObject vierge.
5. Créer et modifier des waypoints dans l'Inspector ; sauvegarder, recharger et tester le trajet.
6. Exporter le jeu Web de la scène et vérifier les comportements, animations, collisions et chemins de modules.
7. Confronter un Avatar humanoïde et un modèle quadrupède riggés à leur animation réelle ; marquer les fonctions non vérifiées explicitement.

**Statut** : code enregistré sur branche de développement, tests et rendu navigateur non encore certifiés.
