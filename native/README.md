# WarLike Native C++ (C++17 / WebAssembly)

Noyau C++17 destiné au mode Play 3D : navigation A* et intégration verticale des Rigidbody (gravité et rebond au sol). Il accélère les calculs de chemins sans imposer de compilation côté utilisateur final. À la différence du SDK C# séparé, **ce module est branché sur le moteur web** lorsque le build WebAssembly est présent.

## Compilation

Installer Emscripten (commande `emcc` disponible), puis :

```sh
sh native/build-wasm.sh
```

Cela génère `native/dist/warlike_pathfinding.mjs` et `native/dist/warlike_pathfinding.wasm`. Les fichiers générés doivent être publiés à côté de l'application pour activer l'accélérateur. Si absents, le moteur continue avec l'A* JavaScript existant.

## Fonction et limites

Le C++ exporte `wl_find_path` via une interface C vers WASM ; les obstacles sont des rectangles sur la grille X/Z. Aucune exécution arbitraire de scripts C++ dans l'Inspector n'est proposée. Ce n'est ni un NavMesh 3D, ni un solveur physique, ni un remplacement général du moteur JavaScript.

## Physique C++

`warlike_physics.cpp` contient `wl_integrate_gravity`, appelée depuis `js/core/physics-3d.js` lorsque le module WASM est présent. Sans binaire compilé, la simulation JavaScript reprend automatiquement. Il s'agit d'un intégrateur vertical simple et non d'une physique rigide complète.
