# WarLike Engine — Références choisies et direction

Ce document distingue les références de conception explicites des fonctionnalités réellement implémentées. Il ne constitue pas une déclaration de parité technique, un partenariat, ni une autorisation d'utiliser des assets ou du code propriétaires.

## Éditeur et workflow
- **Unity / Unity Hub** : architecture des projets, Hub, Scene/Game, Hierarchy, Inspector, composants, organisation des fenêtres, modes 2D/3D et flux Play/Stop.
- **Unreal Engine** : qualité visée pour le rendu et approche de graphes Blueprint; ne signifie pas compatibilité Unreal.
- **Game Creator 2** : logique de gameplay à événements, conditions, actions, variables, quêtes, interactions, et composition de comportements réutilisables.
- **Emerald AI** : perception, occultation, mémoire d'une cible et relations de factions ; adaptation originale au runtime WarLike.
- **Opsive Ultimate Character Controller** : séparation des comportements de personnage, inventaire, équipement et états de santé ; référence de conception sans compatibilité de composants Unity.

## Inspirations de gameplay
- **GTA V** : conduite, contrôle des personnages, monde ouvert et interactions.
- **Red Dead Redemption 2** : immersion, interactions environnementales, comportements de PNJ.
- **Days Gone** : survie, hordes, véhicules et ennemis.
- **Resident Evil Requiem** : tension horrifique, poursuites, exploration et cachettes.
- **Battlefield** : FPS, véhicules et combat.
- **Company of Heroes / Act of Aggression** : RTS, unités, production, bâtiments et tactiques.

Les références de gameplay sont des repères de conception. WarLike doit garder ses propres mécaniques, visuels, assets, interfaces et noms.

## Priorités d'implémentation (ordre)
1. **Fondations** : Hub et persistance fiables; Play/Stop sans erreur; séparation des workspaces 2D/3D; scène enregistrable/réouvrable.
2. **Blueprint opérationnel** : classement type + utilité + genre, Inspector, erreurs explicites; s'assurer que les actions ont un effet runtime observable.
3. **Gameplay** : locomotion/IA, véhicules et collisions, combats, missions, Horror et Survival, RTS. Construire et tester une scène minimale par système.
4. **3D** : modèles avec licences compatibles, rendu PBR, animation, éclairage, navigation et performances.
5. **Écosystème** : extensions vérifiées et documentées, provenance/licences des ressources, tests de régression et distribution.

## Principes de livraison
- Ne pas multiplier les « versions » parallèles de l'éditeur : améliorer le projet existant.
- Marquer les fonctions comme **opérationnelles**, **expérimentales**, **prototype logique** ou **prévues**.
- Ne pas présenter une recette Blueprint ou une miniature d'asset comme un système complet.
- Tester l'éditeur en navigateur, les imports et les sauvegardes avant toute déclaration de fiabilité.
- Ne pas ajouter d'autres moteurs ou logiciels à la liste des références choisies sans validation explicite.
