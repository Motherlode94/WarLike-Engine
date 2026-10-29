# WarLike Native C++ (C++17 / WebAssembly)

Noyau C++17 destiné au mode Play 3D : navigation A* et intégration verticale des Rigidbody (gravité et rebond au sol). Il accélère les calculs de chemins sans imposer de compilation côté utilisateur final. À la différence du SDK C# séparé, **ce module est branché sur le moteur web** lorsque le build WebAssembly est présent.

## Compilation

Installer Emscripten (commande `emcc` disponible), puis :

```sh
sh native/build-wasm.sh
```

Le workflow GitHub `native-wasm.yml` compile et publie automatiquement ces fichiers sur `main`.

La commande locale génère `native/dist/warlike_pathfinding.mjs` et `native/dist/warlike_pathfinding.wasm`. Les fichiers générés doivent être publiés à côté de l'application pour activer l'accélérateur. Si absents, le moteur continue avec l'A* JavaScript existant.

## Fonction et limites

Le C++ exporte `wl_find_path` via une interface C vers WASM ; les obstacles sont des rectangles sur la grille X/Z. Aucune exécution arbitraire de scripts C++ dans l'Inspector n'est proposée. Ce n'est ni un NavMesh 3D, ni un solveur physique, ni un remplacement général du moteur JavaScript.

## Physique C++

`warlike_physics.cpp` contient `wl_integrate_gravity`, appelée depuis `js/core/physics-3d.js` lorsque le module WASM est présent. Sans binaire compilé, la simulation JavaScript reprend automatiquement. Il s'agit d'un intégrateur vertical simple et non d'une physique rigide complète.


Le module est livré au navigateur et aux exports Web. Il accélère A*, la gravité par lots et les intersections 3D. Les appels simultanés à son initialisation partagent le même chargement. Le repli JavaScript reste disponible en cas d’échec.

## Tirs et vision IA en C++

`wl_segment_aabb3d_batch` recherche le premier obstacle touché pour un ou plusieurs
segments 3D. Le moteur l’utilise dans `raycastScene3d` (tir visé du viewport) et
`hasLineOfSight` (perception IA et conditions Blueprint). Les mêmes objets actifs,
exclusions et boîtes de collision sont utilisés par les deux chemins d’exécution.
Les obstacles masquent les cibles derrière eux ; en cas d’égalité, le premier
objet conserve la priorité. Si le module ou l’export est indisponible, le
calcul JavaScript reste utilisable.

Les buffers de requêtes et de gravité sont réutilisés entre appels. Chaque
buffer est borné à 8 Mio ; les requêtes acceptent au plus 4 096 segments,
100 000 boîtes et 20 millions de couples segment/boîte. Une requête invalide
ne modifie pas les résultats précédents. Un lot ne constitue pas un index
spatial : sa complexité reste proportionnelle aux couples testés.

ABI : segments `[fromX, fromZ, fromHeight, toX, toZ, toHeight]`, boîtes
`[x, z, height, width, depth, sizeY]`, toutes les mesures en pixels de scène.
Les résultats sont `[indexBoîte, fractionDuSegment]`, `[-1, -1]` pour un
segment libre. Ces requêtes restent **axis-aligned** ; elles ne remplacent
pas les capsules, rotations et articulations du solveur Rapier.

Après compilation :

```sh
sh native/tests/run-smoke.sh
WARLIKE_REQUIRE_NATIVE_QUERIES=1 node --test tests/native-3d-wasm.test.mjs
node scripts/bench-native-queries.mjs
```

Le workflow compile les binaires puis exige les tests sur le vrai WASM avant
de les publier. Le benchmark inclut le coût de préparation et de copie JS →
WASM, sans annoncer de gain de FPS. `nativeDiagnostics()` expose les capacités,
les appels effectués et la mémoire réservée ; le Hub affiche si les requêtes
de tir et de vision sont disponibles.
