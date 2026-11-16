# Parcours 3D, collisions communes et matériaux — 16 novembre 2026

Branche : `feat/rapier-gameplay-materials-20261116`.

## Changements préparés

- Les déplacements 3D communs interrogent le monde Rapier actif : joueur, véhicules arcade, IA, vol, scripts Move et root motion. Les tirs FPS/véhicules et la visibilité IA utilisent les colliders orientés et leurs décalages. Une porte désactivée cesse immédiatement de bloquer ces requêtes.
- Les rotations et sorties de véhicules vérifient les volumes physiques. Les ensembles filtrés restent respectés, notamment pour permettre le passage des alliés. La gravité concerne aussi les IA immobiles.
- Le mode de collision interne et le comportement 2D restent disponibles. Le routage Rapier appartient uniquement à la session Play qui l'a installé ; il est retiré à sa fermeture. Aucun changement de schéma ni effacement des sauvegardes.
- Les GLB conservent les cartes de normales, métal/rugosité, occlusion et émission, leurs UV individuels et KHR_texture_transform. Les cartes de données utilisent des valeurs linéaires ; les couleurs utilisent la conversion sRGB. Les ressources suivent le même import et le même export GLB autonome qu'auparavant.
- Les modèles sans ces cartes n'allouent pas de buffers UV supplémentaires. Les extensions optionnelles non prises en charge et l'absence de support WebGL des normal maps sont signalées.

## Vérifications reproductibles

| Contrôle | Périmètre et résultat local |
| --- | --- |
| `npm test` | 1 029 tests réussis, aucun échec ; incluant les régressions anciennes et les nouveaux tests Rapier/matériaux |
| `npm run typecheck` | Réussi sur les définitions TypeScript ; ne contrôle pas tout le JavaScript |
| `npm run test:export` | Réussi : ZIP extrait exécuté sur 200 images, animations, collision, JS, WarScript et sauvegarde |
| `node scripts/test-complete-3d-browser.mjs --package-only` | Création de quatre archives réelles : caméra, parcours FPS, galerie de GLB et variante de normal map |
| `tests/complete-3d-route.test.mjs` | Vrai WASM Rapier, déplacement continu sans téléportation : quatre marches, porte fermée puis ouverte, ligne de tir et cible atteinte |
| `npm run test:3d:browser` | Réussi dans Chromium en CI : caméra à la souris, parcours au clavier sans téléportation, porte, tirs, F5/F9, rechargement, reprise et fin ; comparaison des pixels des captures |

Le scénario navigateur utilise souris/clavier, tirs, E, F5/F9, rechargement et reprise, puis la sortie. Il exige une archive sans requête externe ni erreur de page, des captures des étapes et un changement effectif des pixels lorsque le facteur de normal map change. La galerie contient les vrais GLB Kenney d'un personnage, d'une voiture et d'un tonneau, plus une sphère synthétique servant uniquement d'instrument de contrôle des matériaux. Il est exécuté par le job `complete-3d` du workflow `Engine integrity and Web export`. [L’exécution du 16 novembre](https://github.com/Motherlode94/WarLike-Engine/actions/runs/43837675634) confirme ces contrôles sur le commit `0281a97` ; les captures et `report.json` sont dans l’artefact [complete-3d-route-and-materials](https://github.com/Motherlode94/WarLike-Engine/actions/runs/43837675634/artifacts/14211063245). Le rapport indique `PASS`, phase finale `won`, zéro erreur WebGL et 16 270 pixels modifiés par la normal map. Les captures de caméra, galerie et fin ont également été examinées visuellement. Le navigateur local de l’environnement de développement reste indisponible ; la validation visuelle vient de la CI.

## Limites conservées

- La caméra garde ses requêtes de volumes orientés ; le pathfinding conserve sa grille A*. La boucle du prototype RTS Company reste indépendante de ce raccordement Rapier.
- Les véhicules gardent leur conduite arcade ; ce lot n'ajoute ni suspension à roues, ni ragdoll, ni collision de mesh concave.
- L'éclairage conserve son approximation actuelle. Transmission, clearcoat, réflexion IBL et textures compressées ne constituent pas des fonctions achevées de ce lot.
- Le pont C# natif reste indépendant ; les comportements .NET actifs ne sont pas exportables dans le ZIP Web.
- Le parcours au clavier, le contrôle visuel des GLB, les sauvegardes dans le nouveau scénario navigateur et les essais sur GPU réels restent à confirmer. Les anciens contrôles navigateur existent mais n'ont pas été relancés ici.

