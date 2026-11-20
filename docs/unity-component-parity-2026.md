# WarLike Add Component — Unity audit (20 novembre 2026)

La hiérarchie des catégories de Unity sert ici de référence **d'organisation**, pas d'affirmation de parité du moteur. WarLike n'affiche que les composants véritablement disponibles dans `componentChoices()` et son catalogue natif, et n'invente pas les packages Unity manquants.

## Ce qu'expose Unity

- **Animation** : `Animator`, composant legacy `Animation`; Animation Rigging et 2D Animation ajoutent des composants avec leurs packages. L'Animator relie un Controller, un Avatar et les options de Root Motion. Clips/Controller/Avatar sont des assets distincts.
- **Audio** : `Audio Source`, `Audio Listener`, `Audio Reverb Zone`, filtres `Chorus`, `Distortion`, `Echo`, `High Pass`, `Low Pass`, `Reverb`. Spatial Blend règle le son 2D/3D.
- **Constraints** : Aim, Look At, Parent, Position, Rotation, Scale.
- **Effects** : Particle System, Force Field, Line Renderer, Trail Renderer et autres effets selon pipeline/packages.
- **Event** : Event System, Event Trigger, Physics Raycaster 2D/3D.
- **Input** : Player Input, Player Input Manager, contrôles on-screen selon Input System.
- **Layout** : Canvas, Canvas Scaler, Canvas Group, Canvas Renderer, RectTransform, Layout Element, Content Size Fitter et groupes de layout.
- **Mesh** : Mesh Filter, Mesh Renderer, Skinned Mesh Renderer, Text Mesh.
- **Navigation** : NavMesh Agent, Obstacle, Link, Surface et Modifier selon AI Navigation.
- **Physics 2D** : Rigidbody 2D ; Box, Circle, Capsule, Polygon, Edge, Composite, Tilemap et autres colliders ; joints ; Effectors 2D et Constant Force 2D.
- **Physics** : Rigidbody, Character Controller, Articulation Body, Cloth, Constant Force ; Box, Sphere, Capsule, Mesh, Wheel, Terrain Colliders ; Fixed/Hinge/Spring/Character/Configurable joints.
- **Playables** : Playable Director.
- **Rendering** : Camera, Light, Skybox, Volume, probes, LOD, Sorting Group, Sprite Renderer/Mask ; entrées supplémentaires selon pipeline.
- **Scripts** : composants C# compilés dans le projet et les packages, non une liste de faux scripts préinstallés.
- **Tilemap** : Grid, Tilemap, Tilemap Renderer et outils selon packages.
- **UI Toolkit** : UI Document, Panel Event Handler et Panel Raycaster selon package/version.
- **UI** : éléments UGUI tels que Button, Image, Toggle, Slider, ScrollRect, Dropdown, Mask, Shadow/Outline ; TextMeshPro dépend des packages.
- **Video** : Video Player.
- **Visual Effects** : Visual Effect, en présence du VFX Graph.
- Les catégories de packages **AI, Cinemachine, XR, Netcode** etc. ne sont affichées que lorsqu'ils sont installés.

## Écart réel avec WarLike, à ne pas masquer

| Famille | Disponible dans WarLike (exemples) | Manque avant parité |
|---|---|---|
| Animation | Animator Graph, Sprite Animation 2D, rigs GLB | Animator Controller asset autonome ; équivalent complet de l'Animation legacy et Animation Rigging |
| Audio | Audio Source spatial | Listener/Reverb Zones/filtres Unity distincts et pleinement configurables |
| Physics 3D | Collider 3D, Rigidbody 3D, joints, Rapier | toutes formes/joints d'Unity, Cloth/Articulation/Constant Force |
| Physics 2D | Collider/Rigidbody/Joint/Effector 2D | familles complètes de colliders, joints et effectors spécialisées |
| Navigation | Agents, comportement IA | équivalence de toute la chaîne de baking NavMesh et modifiers |
| Rendering | Camera, Light, probes, Sprite Renderer | détails de chaque SRP, Volume et outils avancés |
| UI / Video | structures Canvas/Element partielles | UGUI/UI Toolkit fonctionnels au complet, Video Player |
| Scripts | JavaScript/TypeScript, WarScript, pont C# limité | cycle MonoBehaviour et compilateur/export Web C# équivalents à Unity |

## Rotations et regards

Unity expose `Transform.rotation` en quaternion et `Transform.eulerAngles` comme représentation éditable en degrés X/Y/Z. Il ne faut pas confondre le contrôle d'orientation du GameObject, le regard de la caméra, le mouvement du joueur et le regard d'un squelette (IK).

WarLike PR #129 ajoute dans le **Contrôleur de personnage 3D** : Camera, Movement, Locked et `turnSpeed` (degrés/s). Cela ne prétend **pas** implémenter LookAt/aim IK du visage, rotation verticale des os ni un système complet de contraintes. Ceux-ci devront être ajoutés comme composants testés, avec Play/Export.

## Références officielles Unity

- https://docs.unity3d.com/cn/2021.3/Manual/QuaternionAndEulerRotationsInUnity.html
- https://docs.unity3d.com/6000.0/ScriptReference/Transform-rotation.html
- https://docs.unity3d.com/6000.0/ScriptReference/Rigidbody.html
- https://docs.unity3d.com/6000.0/ScriptReference/AudioSource.html
- https://docs.unity3d.com/6000.0/ScriptReference/Animator.html

**Règle de développement :** ne jamais afficher un composant Unity dans WarLike à moins de disposer d'une implémentation réelle ou d'indiquer explicitement son caractère expérimental/non exportable.
