# Aircraft V6 — Train, volets, aérofreins et animation GLB

## Authoring dans l'éditeur
En projet 3D, sélectionner un aéronef puis **Add Component → Vehicles → Aircraft → Aircraft Systems**. Le composant installe, si nécessaire, Aircraft Physics, Collider3D et Rigidbody3D dynamique en conservant la masse du profil. Il ne peut pas être séparé de son Aircraft Physics par suppression accidentelle.

L'Inspector générique expose les valeurs du composant (y compris les noms de nœuds GLB). Le composant est conservé dans les scènes canoniques et le Web Player.

## Commandes en Play
**G** : déployer/rentrer le train (état, animation GLB et traînée).
**B** : faire défiler les crans de volets 0 / 25 / 50 / 75 / 100 % (avion uniquement).
**X** : ouvrir/fermer l'aérofrein.
Ces commandes sont déclenchées **une fois par appui**. Le HUD de vol indique train, volets, aérofrein.

## Physique
Les volets ajoutent de la portance et de la traînée dans `solveAircraftForces`; l'aérofrein et le train déployé ajoutent de la traînée. Les forces restent appliquées via Rapier au pas fixe, sans transformer directement l'objet. Le solveur sans Aircraft Systems conserve intégralement le comportement V5.

**Limite essentielle :** le train n'ajoute pour l'instant ni roues physiques ni suspension, ni contact au sol dédié. Le collider de l'appareil continue d'assurer les collisions. La simulation reste simplifiée.

## Animation réelle de GLB
`aircraft-visual-rig.js` pilote uniquement des **nœuds GLB réellement présents et de nom unique**. Le composant expose `parts.propeller`, `parts.rotor`, `parts.gear`, `parts.flapL`, `parts.flapR`, `parts.airbrake`. Noms par défaut : Propeller / Rotor / LandingGear / FlapL / FlapR / Airbrake.

Les angles hélice/rotor augmentent avec les gaz ou le collectif pendant le pilotage ; les autres nœuds suivent leurs états. L'animation déforme le maillage GLB via la même voie de pose du viewport que les autres articulations de véhicules. Le moteur **ne génère pas les pièces manquantes**.

## Validation
`node --test tests/aircraft-systems-v6.test.mjs tests/aircraft-systems-integration-v6.test.mjs tests/aircraft-visual-rig-v6.test.mjs`

Avant fusion : vérifier CI, Inspector, Play/Stop, entrées clavier, GLB avec nœuds configurés, persistance, scène V5, export autonome. Un test avec vrai GLB riggé et contrôle visuel reste nécessaire ; les tests unitaires ne remplacent pas la certification navigateur.
