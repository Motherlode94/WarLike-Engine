# Aircraft V4 — Caméra cockpit, poursuite et tableau de bord

## Fonctionnement
Pendant le pilotage d'un avion ou d'un hélicoptère, le viewport 3D prend ses données de `aircraftPhysics`, `aircraftInput`, de la pose réelle du châssis et de `rigidbody3d`.

- **Vue cockpit** : position sur la cellule, orientation suivant le tangage, le roulis et le lacet réels du Rigidbody. La caméra ne reste plus artificiellement horizontale.
- **Vue extérieure** : caméra de poursuite reculée, dirigée vers l'avant de l'appareil.
- **V** : basculement cockpit / extérieur pendant le pilotage uniquement. Une seule bascule par appui.
- **Instruments** : vitesse en km/h, altitude en mètres, vitesse verticale en m/s, cap, tangage, roulis, pourcentage de gaz/collectif.
- L'affichage et l'état du basculement sont réinitialisés lorsque le joueur quitte l'appareil ou quitte Play.

## Configuration
L'objet aérien peut avoir le champ sérialisable `aircraftCamera` :
`{mode:'chase',distance:10,height:2.5,cockpitHeight:0.3,cockpitForward:0.5}`.
Les valeurs sont bornées à la lecture, sans modifier la scène. La scène canonique et le runtime Web incluent ce composant.

## Limitations et certification
- Les instruments reposent sur les valeurs du Rigidbody et de la transformation ; la vitesse affichée n'est pas corrigée du vent (ce n'est pas un anémomètre certifié).
- La vue cockpit est une caméra attachée à la cellule, pas un tableau 3D interactif ou une verrière reconstruite.
- La vue de poursuite suit le véhicule sans solveur d'occlusion spécialisé : obstacles proches à valider en navigateur.
- Les tests unitaires vérifient les mathématiques, le roulis, les unités, le cycle de vie UI, le manifeste Web et la persistance. Le vol complet avec décollage, vol stationnaire et atterrissage reste à certifier séparément dans un navigateur.
- Ne pas fusionner si une CI est rouge.

Tests : `node --test tests/aircraft-camera-v4.test.mjs tests/aircraft-camera-play-v4.test.mjs`.
