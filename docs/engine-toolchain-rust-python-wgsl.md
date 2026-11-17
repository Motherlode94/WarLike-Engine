# WarLike Engine / Editor — Rust, Python et WGSL

**Statut : expérimental et optionnel.** Tous les chemins sont dans le dépôt unique `Motherlode94/WarLike-Engine`. Aucun nouvel interpréteur de gameplay et aucune dépendance obligatoire supplémentaire pour l'utilisateur du navigateur.

## Répartition

| Technologie | Module | Usage visé | Limite actuelle |
| --- | --- | --- | --- |
| Rust + WASM | WarLike Engine / outils géométriques de l'Editor | Calculs purs et géométrie de manipulation | Prototype isolé, pas relié aux gizmos de production |
| Python 3.10+ | WarLike Editor / toolchain hors navigateur | Audit des GLB et métadonnées Meshy, futurs rapports d'import | Outil CLI ; pas de téléchargement ni de rig automatique |
| WGSL / WebGPU | WarLike Engine | Expérimentation shader moderne / futur backend GPU | Shader de prévisualisation isolé, backend WebGL inchangé |

## Python : audit GLB sans modification des ressources

```sh
python3 python/asset_audit.py assets/free/kenney/mini-characters/character-male-a.glb
python3 -m unittest discover -s python -p 'test_asset_audit.py'
```

Le rapport JSON identifie la présence de meshes, skins, animations, matériaux, textures et extensions déclarées. Une entrée `skins: 1` ne prouve **ni** la qualité de rig, **ni** la validité des poids, **ni** la compatibilité Animator ; une analyse approfondie doit suivre. Fichiers limités à 64 MiB ; lecture hors réseau sans exécuter de code tiers. Aucun asset n'est modifié.

## Rust : noyau géométrique optionnel

```sh
cargo test --manifest-path rust/geometry-kernel/Cargo.toml
rustup target add wasm32-unknown-unknown
cargo build --manifest-path rust/geometry-kernel/Cargo.toml --target wasm32-unknown-unknown --release
```

Le module expose `wl_axis_ray_parameter`, paramètre signé le long d'un axe 3D le plus proche d'un rayon caméra. `NaN` signifie un rayon dégénéré/parallèle ; le contrat du fallback JS devra correspondre. Ce calcul **ne remplace pas** seul la sélection, le snapping, les coordonnées écran/monde, le drag ou les Gizmos. Il n'est pas encore chargé en production ; comparer l'exactitude et le coût JS ↔ WASM, notamment les coûts d'appel, avant intégration.

Le moteur dispose déjà de C++/WASM et de Rapier : ne pas dupliquer un solveur physique ou affirmer que Rust accélère forcément le Web. Le code Rust doit cibler des opérations identifiées par un profiler.

## WGSL : shader pilote, rendu inchangé

`shaders/webgpu/preview-unlit.wgsl` définit `vs_main` et `fs_main` pour afficher des sommets et couleurs simples. Le shader **n'est pas** appelé par le rendu WebGL existant. La suite doit ajouter détection `navigator.gpu`, sélection explicite du backend, rapport de fonctionnalités de l'adaptateur, création de pipeline WebGPU, validation d'assets et fallback WebGL. Tests multi-navigateurs/GPU avant toute activation par défaut. WGSL n'est pas CSS et ne change pas la prise en main de l'éditeur.

## Critères pour passer en production

1. Tests unitaires Rust/Python et cas limites (NaN, fichiers GLB invalides, données absentes).
2. Benchmarks représentatifs sur de vraies scènes, sans régression de temps frame.
3. Même résultat visuel / coordonnées des Gizmos sous TS et WASM, y compris caméra retournée.
4. Compatibilité d'export : WASM/shaders inclus quand utilisés, pas de fetch externe obligatoire.
5. WebGPU désactivé si indisponible, WebGL conservé et surveillé.
6. Aucune modification destructive des projets précédents ; respecter `AGENTS.md`.

## Prochain travail à prioriser

Connecter **Python** aux diagnostics d'import (outillage de build, pas navigateur), benchmarker **Rust** contre le calcul JS existant et réaliser un petit harness **WebGPU** visuel avec capture navigateur. Seules les fonctions prouvées plus utiles et fiables doivent être intégrées au runtime principal.


## Intégrations (phase 2)

- **Python relié au CLI WarLike :** `python3 python/warlike.py audit-glb ./mon-modele.glb --output ./rapport.json` produit un rapport analysable par les outils d'import. Ne requiert pas Python au sein du navigateur ; les métadonnées doivent être vérifiées par les importeurs Web avant utilisation.
- **Rust branché aux Gizmos 3D (opt-in automatique selon disponibilité du WASM local) :** compiler avec `sh native/build-rust-wasm.sh`. Le module JS `js/core/rust-gizmo-acceleration.js` charge `native/dist/warlike_geometry_kernel.wasm` si présent ; `js/core/gizmos-3d.js` utilise alors le paramètre d'axe calculé depuis les rayons de caméra pour les translations. Si module absent, rayon dégénéré ou parallèle, l'ancien calcul `projectedAxisDrag3d` reste disponible. La valeur courante est soustraite à la valeur initiale ; aucune activation n'est forcée dans les builds sans WASM.
- **WGSL relié à une prévisualisation de diagnostic WarLike Editor :** `tools/webgpu-preview.html` est ouvrable depuis le menu Aide ; charge `shaders/webgpu/preview-unlit.wgsl`, crée un vrai pipeline WebGPU et dessine un triangle ; en l'absence de WebGPU, dessine la même géométrie en WebGL. C'est un outil expérimental ; **le moteur de production reste WebGL**.

### Limites à résoudre avant la publication

Le script de compilation Rust n'est pas exécuté par défaut en CI et le binaire WASM n'est pas versionné. Il faut des tests dans un navigateur avec binaire compilé pour qualifier les déplacements sur toutes les orientations. Le diagnostic WGSL vérifie uniquement les couleurs de sommets, pas les textures PBR ni l'Animator. L'audit Python inspecte les métadonnées GLB sans valider les poids du rig ni le rendu des matériaux.
