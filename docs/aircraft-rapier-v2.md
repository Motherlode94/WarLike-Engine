# WarLike Engine — Aircraft Physics V2 (avions et hélicoptères)

## Intégration à Rapier
La physique aérienne V1 (`aircraft-flight-physics.js`) produit des forces et couples en unités SI. L'adaptateur `aircraft-rapier.js` les applique **à chaque pas fixe** sous forme d'impulsions Rapier, avant `world.step()`. La gravité reste sous la responsabilité de Rapier : aucune double gravité. Les corps non configurés ne sont pas modifiés.

Deux profils :
- **Avion** : portance, vitesse relative à l'air, décrochage simplifié, traînée, poussée et moments pitch/roll/yaw.
- **Hélicoptère** : poussée verticale rotor, collectif, cyclique, traînée et moments de rotation.

## Configuration depuis l'éditeur
Projet **3D** : **Add Component → Vehicles → Aircraft → Aircraft Physics**. Le composant ajoute si nécessaire Collider3D et Rigidbody3D dynamique (rotations libres), avec une masse cohérente. Dans l'Inspector, choisir **Avion** ou **Hélicoptère**. Les paramètres numériques du solveur sont également éditables par l'Inspector générique ; le profil sélectionné remplace les valeurs courantes.

## Entrées du simulateur
L'entité peut porter la configuration sérialisable suivante :

```js
aircraftInput: {
  throttle: 0,   // 0..1 : moteur principal
  collective: 0, // 0..1 : rotor hélicoptère
  pitch: 0,      // -1..1
  roll: 0,       // -1..1
  yaw: 0         // -1..1
}
```

`aircraftWind: {x:0,y:0,z:0}` décrit le vent mondial (m/s).
Ces entrées sont consommées par le pas Rapier ; **le raccordement aux touches de conduite et à la caméra cockpit n'est pas encore implémenté**. Le composant nécessite un projet configuré avec le backend Rapier. Il n'est pas un simulateur aérodynamique certifié.

## Sécurité et limites
- Le même module est présent dans la fermeture Player pour l'export Web ; la compatibilité est contrôlée à l'export.
- Rigidbody3D dynamique, Collider3D actif et rotations non verrouillées requis.
- Ne pas combiner `groundVehiclePhysics.enabled` et `aircraftPhysics.enabled` sur le même GameObject.
- Les profils ne proposent pas encore de train d'atterrissage, rotor riggé, frein aérodynamique, autopilote, instruments ou gestion avancée des défaillances.
- CI et validation navigateur restent nécessaires avant fusion.

Tests ciblés :
`node --test tests/aircraft-rapier.test.mjs tests/aircraft-editor-v2.test.mjs tests/aircraft-flight-physics.test.mjs`.
