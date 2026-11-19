# WarLike Engine — Components ≠ Prefabs

Référence conceptuelle : [Unity 6.6, GameObjects / Components](https://docs.unity.com/en-us/engine/6000.6), complétée par le catalogue de `component-definitions.js` et `nativeComponentCatalog` dans `inspector.js`.

## Contrat

- **GameObject** : objet unique dans la scène, avec identité, hiérarchie et Transform.
- **Component** : comportement ou donnée attachée à un objet, visible dans **Inspector → Add Component**, éditable, enregistrable. Il ne crée pas automatiquement un personnage, modèle ou prefab.
- **Prefab** : sauvegarde réutilisable d'une configuration d'objet(s) ET de composants, avec source, instances et overrides.
- **Script** : comportement programmable pouvant être attaché à un objet ; WarNode reste un système de logique/graphes, pas un objet visuel préfabriqué.
- **Asset** : ressource (modèle, texture, audio). Importer un modèle n'ajoute pas automatiquement les contrôleurs métiers.

## Composants existants attachables

| Famille | Entrées actuelles | Portée |
| --- | --- | --- |
| Physique 2D | Collider 2D, Rigidbody 2D, Joint 2D, Effector 2D | Web, projet 2D |
| Physique 3D | Collider 3D, Rigidbody 3D, Joint 3D, Objet saisissable | Web, projet 3D ; Joint dépend de Rapier |
| Personnages | Contrôleur 2D, Contrôleur 3D, santé/endurance, inventaire, IA | Comportements Web existants |
| Véhicules | VehicleController | Composant existant sous `csharpComponents`, paramètres convertis pour Web ; arcade, **pas** WheelCollider réaliste |
| Mouvements | FollowActor, LinearMotion, AutoRotate | Pont C# local selon composant |
| Combat / Jeu | Weapon, Damageable, Health, Respawn, Projectile, Team, Score, objectifs | Composants existants ; compatibilité Web déterminée par leur runtime réel |
| Animation | Animator Graph, Sprite Animation 2D | Implémentations partielles ; retargeting complet non garanti |
| Caméra | Camera 2D/3D, Camera Rig | Web avec restrictions selon contexte |
| Scripts | WarScript, JS/TS, composants C# reconnus | Le pont C# .NET local **n'est pas automatiquement exportable sur Web** |
| UI | UI Canvas, RectTransform, UI Element | Structure éditable, comportement en jeu encore incomplet |

## Manques à développer, sans faux composants

- **Animal Controller** dédié : locomotion quadrupède, états de déplacement, perception et animation ; ne pas confondre une IA générique existante avec cette fonctionnalité.
- **WheelCollider / Vehicle Suspension** : roues, suspension, transmission physique et contact sol. `VehicleController` ne fournit aujourd'hui qu'une conduite arcade et des réglages de mouvement.
- **Sous-types de colliders** : le sélecteur actuel propose un Collider 2D/3D avec forme éditable plutôt qu'une entrée indépendante pour chaque forme.
- **Player Input / Input Actions**, **Audio Listener**, **Mesh Renderer** dédié, **Navigation Agent** et édition graphique avancée des contraintes : auditer l'intégration avant de les rendre ajoutables.
- **WarNode** : vérifier l'attachement d'un graphe éditable, sa compilation/exécution, sauvegarde et export plutôt que déclarer un composant fictif.

## Validation obligatoire

1. Ajouter un composant depuis Add Component à un GameObject vide sans créer d'asset ou prefab.
2. Modifier ses valeurs dans Inspector, sauvegarder, fermer, rouvrir et vérifier les propriétés.
3. En mode Play, vérifier l'effet effectif du comportement, ses collisions/événements et les dépendances.
4. Refaire la vérification dans le jeu Web exporté ; avertir explicitement des composants exclusivement .NET.
5. Former ensuite un Prefab depuis l'objet configuré et contrôler les instances/overrides indépendamment.
6. Refuser le statut « terminé » aux composants visibles sans comportement valide.
