# WarLike Engine — Audit de transformation (octobre 2026)

Ce document décrit les écarts structurels observés directement dans le dépôt. **Une référence GLB n'est pas la preuve d'un asset affichable ou animé.** Les composants ajoutés mais non validés par Play / tests restent expérimentaux.

| Domaine | Constat | Action |
|---|---|---|
| Hub et projets | Stockage principalement local au navigateur | Tests restauration, migrations de sauvegardes, erreurs explicites |
| Éditeur 2D | Simulation et outils distincts du rendu 3D | Vérification de chaque démonstration et des imports |
| Rendu WebGL 3D | Shader maison avec matières approximatives | Vérifier le lien des shaders sur plusieurs GPU ; ajouter UV, textures, PBR |
| GLB | Géométrie décodée en triangles ; animations et textures incomplètes | Normalisation uniforme corrigée ; suite : matériaux, skinning, animation |
| Miniatures GLB | Images Khronos JPG, parfois seules PNG disponibles | Essai JPG puis PNG puis projection du mesh |
| Assets | Catalogue mixte : primitives, GLB distants et fichiers locaux | Séparer les types et vérifier statut/licence/format par modèle |
| Physique 3D | AABB simple + gravité ; pas de solveur d'impulsions complet | Connexion collision WASM optionnelle corrigée ; tests d'intégration requis |
| Navigation | A* sur grille avec évitement local | Navmesh/navvolume, obstacles dynamiques, portes |
| Joueur | Controller 3D expérimental | Pentes, marches, capsules, états d'animation |
| Combat | Dégâts de proximité sans pipeline de combat complet | Hitboxes, projectiles, sockets, effets |
| IA | Patrouille/poursuite/attaque | Perception, état mémoire, événements, pathfinding robuste |
| Visual Logic | Formulaires de triggers/conditions/actions et aperçu | Éditeur nodal exécutable et débogage par étape |
| Sauvegarde | JSON sans GLB local binaire | Asset manifest + stockage durable/résolution des chemins |
| C# | Runtime .NET indépendant et pont local expérimental | Exécuter les composants depuis le Play Mode et gérer leurs cycles de vie |
| C++ / WASM | Code A* et physique ; binaire non confirmé | Compiler, charger, tester et profiler avant activation par défaut |
| Publication | Cloudflare Pages, pipeline de typecheck | Exécuter npm test, tsc et tests navigateur avant déclarer une release stable |

## Correctifs réalisés dans ce chantier

- Préserver les proportions X/Y/Z réelles des GLB avec une mise à l'échelle uniforme.
- Essayer des captures Khronos JPG puis PNG ; rendu local du mesh en dernier recours.
- Brancher la détection de collision AABB C++ lorsqu'un binaire WASM compatible est disponible ; conserver JavaScript sinon.

## Portes de validation requises

1. `npm test` et `npm run typecheck` passent.
2. Tester le Hub : créer, fermer, rouvrir, renommer et exporter un projet 3D.
3. Vérifier 3 GLB représentatifs dans le navigateur (humanoïde, véhicule, objet), y compris proportions, miniature et console.
4. Vérifier Play : déplacement, collision, IA, sauvegarde/chargement, arrêt.
5. Compiler le WASM via `sh native/build-wasm.sh` et comparer les sorties avec la version JS.
6. Tester sur plusieurs navigateurs et GPU. Ne pas publier une affirmation de compatibilité sans cette vérification.

La cible produit : **un moteur capable de produire et exporter un petit jeu 3D complet et stable**, avant de multiplier les références et démos.
