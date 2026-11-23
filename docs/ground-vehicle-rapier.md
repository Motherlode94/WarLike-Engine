# Véhicules terrestres V2 — Roues, suspension et Rapier (expérimental)

Trois profils **opt-in** sont définis dans `js/core/ground-vehicle-rapier.js` :
- `car` — voiture 4 roues (essieu avant directeur, roues arrière motrices).
- `truck` — camion 6 roues.
- `tracked` — blindé à 12 points de suspension, répartition de poussée différentielle gauche/droite pour tourner sur place.

`defaultGroundVehiclePhysics(kind)` fournit une configuration sérialisable à placer dans `entity.groundVehiclePhysics`. L'acteur doit posséder un `Rigidbody3D` **dynamique**, `lockRotations:false`, et un Collider3D. Les forces sont calculées à chaque pas Rapier depuis des raycasts de sol, en unités SI, appliquées via des **impulsions équivalentes à un pas fixe**, aux points de contact. Aucun contact : aucune force de roue. Les autres voitures arcade ne sont pas affectées.

Entrées pilotables par scripts ou composants, **pas encore mappées à l'Input Manager** : `entity.groundVehicleInput={throttle,steer,brake,handbrake}`. `throttle` et `steer` vont de -1 à 1, frein de 0 à 1. Le véhicule à chenilles utilise un contrôle différentiel des côtés. La masse de `rigidbody3d.mass` doit correspondre au profil pour une dynamique cohérente.

**Limites** : montage et Inspector graphique pas encore fournis ; pas de visualisation des roues ni synchronisation de rotation roue, pas de transmission ni boîte physique, géométrie chenilles simplifiée, pas encore de scène de certification jouable. L'intégration moteur est optionnelle pour éviter toute régression des véhicules existants. Les tests de contrat Rapier et du manifeste d'export sont obligatoires. Avant validation, tester en navigateur terrain plat, pente, obstacles, freinage, garde au sol, rigidbody et export Web.

Validation : `node --test tests/ground-vehicle-rapier.test.mjs`.
