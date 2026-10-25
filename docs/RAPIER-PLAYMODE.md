# Rapier 3D dans WarLike Studio

Rapier 3D est disponible en tant que moteur physique **expérimental et optionnel** pour les projets 3D.

## Utilisation

1. Ouvrir un projet 3D.
2. Dans **Project / Assets**, cocher « Physique Rapier 3D (WASM) ».
3. Démarrer le Play Mode. La simulation Rapier est chargée de manière asynchrone.
4. À l'arrêt du Play Mode, les ressources physiques natives sont libérées.
5. Pour revenir à la physique intégrée, décocher l'option puis relancer Play.

La préférence est stockée localement sous `warlike.rapier3d`. Elle n'est pas une propriété exportable du projet.

## Chargement

La version `@dimforge/rapier3d-compat@0.21.0` est épinglée dans l'import map de `index.html` via jsDelivr. Rapier est diffusé sous licence Apache 2.0. Une connexion Internet et une politique CSP autorisant ce module sont nécessaires. Si le chargement échoue, le Play Mode garde la physique intégrée.

## Limitations connues

- Simulation indépendante : les corps sont créés à l'entrée en Play. Les changements de colliders après l'initialisation ne sont pas encore synchronisés.
- Tous les objets sont représentés par des colliders cuboïdes ; les meshes triangulés, capsules, joints, CCD et véhicules restent à ajouter.
- Les personnages pilotés par l'ancien contrôleur n'ont pas encore de character-controller Rapier dédié.
- Les forces et impulsions appliquées au champ JS `rigidbody3d` ne sont pas encore automatiquement transmises aux rigid bodies Rapier.
- Le runtime natif C# est toujours distinct du moteur physique navigateur.
- Le nouveau chemin Rapier nécessite tests navigateur, tests de collisions et mesures FPS avant promotion en moteur par défaut.

## Référence

https://rapier.rs/docs/user_guides/javascript/getting_started_js/
