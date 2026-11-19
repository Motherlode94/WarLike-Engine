# P5 — Laboratoire natif de certification FPS/TPS

Le module `tests/p5-fps-tps-certification-fixture.mjs` réutilise la scène **Parcours 3D** de WarLike Engine, ses GameObjects, ses collisions, sa porte interactive, son personnage et ses modèles GLB. Il ajoute une **cible mobile** pilotée par le `Navigation Agent` natif et des graphes `Animator` sur le joueur et la cible. Deux variantes conservent la scène et changent seulement le rig de caméra : FPS et TPS.

Il ne contient **aucun moteur parallèle**. Les tests `tests/p5-fps-tps-certification.test.mjs` vérifient les composants, les obstacles, le déplacement de la cible, ses paramètres Animator, l'orientation caméra/marche/tir, la sauvegarde canonique et la préparation d'un export Web qui ne modifie pas la scène.

## Périmètre de validation

| Étape | Contrôle | Preuve attendue |
| --- | --- | --- |
| P5-A | Node : acteur, collisions, cible mobile, Animator | `node --test tests/p5-fps-tps-certification.test.mjs` |
| P5-B | Projet natif : sauvegarde et chargement | Scène canonique round-trip |
| P5-C | Packaging Web | `prepareGameDefinition`, manifestes, scripts de production existants |
| P5-D | Play navigateur FPS puis TPS | captures, direction à 90°/180°, visée gauche/droite, clic gauche/tir, clic droit/viser |
| P5-E | Physique et animation sur scène complexe | obstacles, cible mobile, collision et transition Animator |
| P5-F | Parité jeu exporté / éditeur | comparer captures, positions, états et actions sur les mêmes séquences |

Le fixture est **importable par les systèmes natifs de tests et de génération de projets**, mais **il n'a pas encore de commande d'interface pour être ajouté à une scène utilisateur**. L'export autonome testé en navigateur nécessite toujours la CI existante et une validation réelle sur cette variante spécifique. Aucun résultat manuel ne doit être annoncé avant exécution.

## Quality gates

1. CI Node et TypeScript ;
2. scénarios `Engine integrity and Web export` et `complete-3d` existants ;
3. Playwright navigateur pour les deux variantes P5, à renforcer sur la séquence de visée/animation réelle ;
4. essai visuel et navigation mobile si applicable ;
5. passage de la PR en revue et fusion uniquement après validation.
