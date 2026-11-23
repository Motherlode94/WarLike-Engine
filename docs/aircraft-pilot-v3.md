# Aircraft V3 — Pilotage avion et hélicoptère

Le composant **Aircraft Physics** V2 utilise Rapier à chaque pas fixe. V3 connecte ses commandes au système existant de conducteur : entrée/sortie **E** à proximité d'un avion ou hélicoptère et transmission de **aircraftInput** au solveur physique. Les positions de l'appareil ne sont jamais déplacées directement par le système de conduite arcade.

## Commandes par défaut (clavier)

| Touche | Avion | Hélicoptère |
|---|---|---|
| E | Entrer / sortir lorsque posé | Entrer / sortir lorsque posé |
| W ou Z | Augmenter progressivement les gaz | Augmenter le collectif |
| S | Réduire les gaz | Réduire le collectif |
| Flèche haut / I | Cabre (pitch +) | Cyclique longitudinal + |
| Flèche bas / K | Pique (pitch −) | Cyclique longitudinal − |
| Flèche droite / L | Roulis droit | Cyclique latéral droit |
| Flèche gauche / J | Roulis gauche | Cyclique latéral gauche |
| D | Lacet droit | Lacet droit |
| A ou Q | Lacet gauche | Lacet gauche |

Les commandes pitch, roll et yaw reviennent automatiquement à zéro quand les touches sont relâchées. Les gaz/collectif persistent jusqu'à nouvelle intervention pour éviter des variations brusques. Une sortie est refusée au-dessus de 2,5 mètres, en l'absence de simulation de parachute ou de procédure d'éjection.

## Limites
- Les caméras troisième personne existantes continuent de suivre l'acteur piloté, mais **une caméra cockpit dédiée et un HUD d'instruments ne sont pas encore présents**.
- Ce système reste un prototype de conduite et doit être certifié en Play réel et dans un jeu Web exporté.
- Le modèle aérodynamique V1 est simplifié et ne reproduit pas une simulation de haute fidélité.
- Le joueur ne peut entrer que lorsque l'appareil est suffisamment proche horizontalement et verticalement, conformément au système de véhicules déjà existant.
- La procédure de sortie à l'arrêt n'est pas un simulateur réaliste d'évacuation.

## Validation

`node --test tests/aircraft-pilot-input.test.mjs tests/aircraft-pilot-integration-v3.test.mjs tests/aircraft-rapier.test.mjs`

Vérifier le mode Play et l'export avec un avion qui accélère et décolle sur piste, un hélicoptère en vol stationnaire, le freinage/atterrissage, la sauvegarde, la réouverture et le comportement du joueur après sortie.
