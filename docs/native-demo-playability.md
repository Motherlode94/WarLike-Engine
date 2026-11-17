# WarLike Engine — Fiabilisation des jeux et démos natives

> Extension des scènes déjà présentes dans **WarLike Engine**, sans importer de jeux indépendants ni remplacer leurs missions par des décors.

## Périmètre

Le catalogue `genreTemplates` contient des parcours de jeu en **2D et/ou 3D** : aventure, survie, FPS/TPS tactique, RTS, course, plateforme, horreur, monde ouvert, RP, simulation, RPG, 4X, super-héros, Field Lab et scènes spécialisées Liens de vie / Company / Battlefield.

Ces scènes restent des **GameObjects et composants sérialisés du moteur**. Elles utilisent les systèmes de gameplay WarLike existants (Blueprint/WarNode, scripts, physique, inventaire, objectifs, véhicules et comportements spécialisés suivant le genre).

### Changements de cette PR

1. **Camera de jeu dans les scènes** : les jeux qui utilisent un joueur standard reçoivent une `sceneCamera3d` ou `camera2d` reliée au GameObject du personnage. Le mode FPS existant utilise la Camera FPS, les autres jeux 3D standards utilisent la Camera TPS ; les jeux RTS/Company/Battlefield conservent leur contrôleur de caméra spécialisé. Aucun second renderer n'est introduit.
2. **Field Lab** : le parcours de diagnostic se termine désormais avec l'action native `winGame`, après validation de marche, interaction et conduite. Une simple variable `labCompleted` ne suffisait pas à terminer une partie.
3. **Audit de scènes** : le module `inspectBundledGame` vérifie les identifiants GameObject, la présence d'un joueur, les composants Camera, les comportements, les collisions de base et les liens des objectifs vers des cibles réelles.
4. **Tests de catalogue** : `tests/demo-native-playability-audit.test.mjs` parcourt tous les genres et les modes compatibles, les trois parcours 3D historiques et la cohérence du checkpoint final de Field Lab.

### Ce que ces tests vérifient — et ce qu'ils ne prouvent pas

Les contrôles de données signalent les références cassées avant que le joueur ne lance Play. Ils **ne constituent pas** une certification que chaque jeu est terminable sur une machine réelle : interactions souris/clavier, rigging, physique Rapier, rendu GLB, performances et export Web doivent aussi être exercés en navigateur. Les tests de route réellement jouée (sans téléportation) existent déjà pour **Quartier du Canal** et **Rooftops**, et les tests de collisions de course pour le garage.

Cette étape prépare une validation de chaque genre en Play/Stop et dans un export autonome. Les scripts de niveaux restent éditables et ne nécessitent ni navigateur externe ni jeu hébergé ailleurs.
