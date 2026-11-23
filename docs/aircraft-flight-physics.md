# Véhicules aériens — fondation de dynamique de vol V1

## Objectif
Un solveur 3D déterministe **sans dépendance graphique**, avec deux configurations :
- **Avion** : poussée propulsive, portance avec angle d'attaque, décrochage simplifié, traînée parasite/induite, glissement latéral, moments pitch/roll/yaw.
- **Hélicoptère** : poussée du rotor pilotée par collectif, inclinaison de poussée via cyclique, mouvement et traînée, moments de rotation et amortissement.

API : `defaultAirplanePhysics()`, `defaultHelicopterPhysics()`, `validateAircraftConfig(config)`, `solveAircraftForces(args)` dans `js/core/aircraft-flight-physics.js`.

Les valeurs sont en **mètres, kilogrammes, secondes, newtons et newtons-mètres**. L'espace de calcul est **Y vertical**, avec vecteurs `forward`, `right`, `up` fournis en coordonnées monde. Le moteur historique présente également des coordonnées scène en pixels et `elevation3d`; l'adaptateur doit effectuer la conversion adéquate.

## Contrat d'intégration
1. Créer un Rigidbody physique pour la cellule, enregistrer le type (`airplane` ou `helicopter`) et les réglages dans le modèle de scène sérialisable.
2. Récupérer à chaque **pas fixe** la vitesse linéaire, angulaire, l'orientation et le vent, convertir dans le repère physique Y-up.
3. Lire les actions d'entrée (pitch, roll, yaw, throttle/collective), puis appeler `solveAircraftForces`.
4. Appliquer `force` et `torque` au corps dynamique Rapier. La gravité est **exclue par défaut** (le moteur Rapier doit l'appliquer). `includeGravity` sert uniquement aux bancs d'essais sans gravité externe.
5. Laisser Rapier gérer collisions, contacts, immobilisation au sol, roues et impacts, puis transférer la pose physique vers le renderer.
6. Exécuter **la même intégration** dans l'éditeur Play et dans l'export Web. Certifier en navigateur avec trajectoires de décollage, vol stationnaire, virage, collision et réouverture de scène.

## Limites actuelles
**Il s'agit d'une fondation mathématique, pas encore d'un véhicule pilotable dans l'éditeur** : aucun branchement Play, Inspector, sérialisation, input mapping, prefab, pilotage caméra ou export n'est inclus dans cette première PR. Pas de simulation avancée de vortex, autorotation, rotor anticouple ni modèle de décrochage haute fidélité. Ne pas supprimer les tests physiques existants pour forcer la CI.

Test ciblé : `node --test tests/aircraft-flight-physics.test.mjs`.
