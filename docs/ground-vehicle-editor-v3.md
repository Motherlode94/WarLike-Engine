# Ground Vehicle Physics V3 — Components + Inspector + pilotage Rapier

## Création sans script
Dans un projet 3D, sélectionner un GameObject :
**Add Component → Vehicles → Physics → Ground Vehicle Physics · Rapier 3D**.

Le composant installe, si nécessaire, un Collider3D, un Rigidbody3D dynamique avec rotations déverrouillées, et le Vehicle Controller existant. Il initialise un **profil voiture à 4 roues**. Sa masse physique est alignée sur celle du profil. Les Rigidbody/Collider existants sont conservés. Les composants requis ne peuvent pas être supprimés tant que la physique du véhicule est attachée.

## Inspector
Dans la carte **Ground Vehicle Physics · Rapier 3D** :
- activer/désactiver la physique, modifier masse, propulsion et freinage (champs génériques) ;
- sélectionner le profil voiture (4 roues), camion (6 roues) ou blindé (12 points de suspension) ;
- ajuster le rayon, la longueur et la course de suspension, le ressort, l'amortissement et l'adhérence **roue par roue** ;
- vérifier les bornes avant enregistrement (paramètres de roue invalides rejetés).
- les profils remplacent explicitement l'ensemble des réglages de roues existants ; cela nécessite une action volontaire.

## En jeu
Le joueur entre et sort avec **E**, comme pour les autres véhicules. Les touches existantes W/Z/S et flèches commandent la traction, A/Q/D la direction et Espace le frein de stationnement. Les entrées sont transmises à `groundVehicleInput` puis consommées par la physique Rapier, **sans second mouvement arcade**.
Le contrôle des caméras reste celui de la scène. Une caméra cockpit dédiée et une interface complète de transmission ne sont pas encore réalisées.

## Export et précautions
Les données `groundVehiclePhysics` sont ajoutées au contrat de scène canonique et restent dans les entités exportées. Les objets utilisent la même simulation Rapier dans Play et le runtime Web lorsque le projet utilise Rapier. La configuration est validée lors du contrôle de compatibilité. Pour une physique stable, ne pas piloter simultanément le châssis par un autre script modifiant directement sa position.

Limites : absence de Prefab automobile visuel complet et de banc d'essai navigateur des pentes ; réponse de freins/renversement/chenilles à améliorer, pas de modèle de boîte de vitesses physique. Le passage entre profils reconfigure les points de suspension. Les coordonnées du châssis sont en mètres dans l'adaptateur physique.

## Certification
`node --test tests/ground-vehicle-editor-v3.test.mjs tests/ground-vehicle-rapier.test.mjs tests/vehicle-driving.test.mjs`

Ne pas fusionner tant que **tous** les contrôles GitHub Actions ne sont pas verts. Tester également dans le navigateur : ajout du composant, paramètres de roues, sauvegarde/réouverture, Play/Stop, entrée/sortie, gravité/collisions et ZIP autonome.
