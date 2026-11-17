# Rendu 3D : matériaux et transparences — 17 novembre 2026

## Comportement

Le soleil, les lumières ponctuelles, les spots et la lampe de poche partagent désormais le même calcul de réflexion GGX avec visibilité Smith corrélée et Fresnel Schlick. La rugosité contrôle la largeur du reflet ; la métallicité sépare la couleur réfléchie et la part diffuse. La couleur du soleil teinte aussi le reflet. Les cartes GLB de normales, métal/rugosité, occlusion et émission continuent d'alimenter ce shader. Les matériaux non éclairés restent indépendants des lumières.

Les dessins opaques précèdent une passe transparente commune aux GLB, à l'eau et aux aperçus de construction. Cette passe trie les dessins selon leur profondeur dans la caméra et tient compte de la correction affine des objets parents. L'évaluation des animations et des sockets garde son ordre existant ; les poses des instances partageant un buffer sont envoyées au moment effectif du dessin.

Aucun changement de format, migration ou réécriture de projet. Les propriétés existantes `materialRoughness` et `materialMetallic` restent utilisées. L'apparence peut changer, car le modèle d'éclairage est différent ; aucun réglage sauvegardé de lumière n'est compensé automatiquement.

## Vérifications

- `npm test` : 1 061 tests réussis sur la première version du lot.
- `npm run typecheck` : réussi.
- `npm run test:export` : export réel exécuté sur 200 images ; animation, collision, JavaScript, WarScript et sauvegarde réussis.
- `node scripts/test-3d-pbr-browser.mjs` : compilation du shader de production et lectures de pixels WebGL sous Chromium. Contrôle la rugosité, les reflets teintés par le soleil, les lumières ponctuelles et les spots, la lampe métallique, le contre-jour et les matériaux non éclairés. Première exécution CI réussie.
- `node scripts/test-complete-3d-browser.mjs` : parcours FPS exporté, caméra, marches, porte, tirs, sauvegarde/reprise, galerie de vrais GLB et comparaison des normal maps. Deux scènes supplémentaires inversent l'ordre d'entités transparentes devant un fond opaque ; leurs pixels doivent rester identiques et conserver les trois couches. Résultats finaux à consulter dans la PR.

Le navigateur d'aperçu local ne fournit pas de contexte WebGL. Les vérifications graphiques s'exécutent dans le job Chromium `complete-3d`, avec captures et rapports joints à l'artefact `complete-3d-route-and-materials`. Les tests de pixels sont instrumentaux ; ils ne constituent pas un examen artistique ni une mesure de performance sur GPU physique.

## Limites

- Lumière ambiante hémisphérique approximative, sans réflexion d'environnement IBL, transmission/réfraction ou nouvelles ombres portées.
- Transparence triée par centre de dessin, sans tri des triangles : les meshes transparents qui s'interpénètrent peuvent encore présenter des erreurs.
- Les effets de particules conservent leur passe séparée et leurs limites de tri.
- La géométrie, la physique Rapier et les formats de projet ne sont pas modifiés par ce lot.

Référence du modèle de matériau : [spécification glTF 2.0, annexe BRDF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#appendix-b-brdf-implementation).
