# Sources, auteurs et licences

## Développement du moteur

**Hardi Victor MBANVU — HardieBay** : conception et développement de WarLike Studio.

Aventure / Le phare et la vallée (deux scénarios Blueprint, interactions ciblées, journal, dialogues à choix, inventaire de quête commun, pont à réparer et persistance des scènes et du groupe), Hero Forge (pouvoirs, progression, simulation, escouades et FX procéduraux), Survival / Première aube (besoins, récolte, fabrication, aperçu de construction, progression commune, secours, outils avec usure et réparation, et sauvegardes de campement), Animator, FX Studio, la coop et le relais Python LAN, le Hub, l’éditeur, Blueprint Studio, les contrôleurs, la caméra, les comportements IA, la navigation sur grille, les systèmes de jeu, le pipeline d’assets et les runtimes WarLike sont du code du projet. Le lissage et l’optimisation A* intègrent le patch de navigation fourni pour ce projet. Les inspirations Unity, Game Creator, Emerald AI et Opsive ne constituent pas une intégration de leurs produits ou de leurs sources.

## Ressources incluses

- **[Kenney](https://kenney.nl/)** — modèles 3D, sprites 2D, sons et UI. **CC0-1.0**. [Packs officiels](https://kenney.nl/assets) · [Notice locale](assets/free/kenney/LICENSE.md).
- **[Quaternius](https://quaternius.com/)** — modèles 3D et animations des archives CC0 retenues. **CC0-1.0**. [Ultimate Guns](https://quaternius.com/packs/ultimategun.html) · [Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html) · [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) · [Notice locale](assets/free/quaternius/LICENSE.md).

Les GLB, textures, sons et aperçus sont livrés dans `assets/free/`. Les notices originales sont conservées. Le [tableau complet des 105 packs 3D](docs/complete-model-library.md) indique le nom, l’auteur, la licence et le lien officiel de chaque pack. Le [catalogue d’inventaire](docs/free-model-library-inventory.json) et `assets/free/*/models.json` associent les fichiers à leurs sources et empreintes SHA-256.

Les sept sprites isométriques de [survival-sprites-2d.js](js/assets/survival-sprites-2d.js) sont des rendus transparents réalisés dans WarLike à partir des modèles CC0 **Kenney Survival Kit et Nature Kit** déjà inclus. Leurs fiches conservent l’identifiant du GLB source, l’auteur, la licence et le lien du pack. Le [script de rendu](scripts/assets/render-survival-sprites.cjs) permet de les régénérer. Ces dérivés ne sont pas comptés comme des modèles 3D supplémentaires.

Le pipeline utilise les archives officielles ou des miroirs CC0 épinglés par révision, dont [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets). Les URL exactes et empreintes des archives sont dans [free-model-sources.json](scripts/assets/free-model-sources.json). Les aperçus non fournis par la source sont rendus à partir des véritables modèles dans le renderer du moteur. La conversion conserve les prises d’animation originales ; les grandes textures sont partagées localement et limitées à 1 024 pixels.

La licence indiquée correspond aux **archives précises incluses**, pas à toutes les éditions disponibles sur le site de l’auteur. Les ressources dont la licence interdit la redistribution d’assets ne sont pas livrées. Les packs non récupérés et la raison sont indiqués dans [unavailable-packs.json](scripts/assets/unavailable-packs.json).

## Code tiers et outils

| Projet | Rôle | Licence / source |
| --- | --- | --- |
| Phaser | `Clamp` 3.90.0 adapté en module ES ; dépendance également déclarée pour les vues expérimentales | [MIT, notice vendue](vendor/phaser/LICENSE.md) · [Phaser officiel](https://github.com/phaserjs/phaser) |
| Three.js | Dépendance des vues 3D expérimentales ; le viewport principal utilise le renderer WebGL WarLike | [MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE) |
| Rapier | Physique 3D optionnelle | [Apache-2.0](https://github.com/dimforge/rapier.js) |
| Blender | Conversion FBX / OBJ / glTF pendant l’import, avec scripts Python du projet | [GPL, projet officiel](https://www.blender.org/about/license/) ; Blender n’est pas distribué avec le jeu |
| Pillow | Traitement des textures pendant l’import | [HPND](https://github.com/python-pillow/Pillow) |
| Playwright | Automatisation des aperçus et vérifications navigateur | [Apache-2.0](https://github.com/microsoft/playwright) |
| Emscripten | Compilation des systèmes C++ WarLike en WebAssembly | [MIT / NCSA](https://github.com/emscripten-core/emscripten) |
| .NET | Exécution du runtime et bridge C# local | [Projet officiel](https://github.com/dotnet/runtime) |

Les versions des dépendances JavaScript sont déclarées dans `package.json`. Les outils de conversion et leurs versions sont fixés dans les workflows de build.

## Imports personnels et sources externes optionnelles

Les anciens modèles de démonstration Khronos et catalogues réseau restent identifiés comme externes et conservent leurs licences propres. Ils ne font pas partie du décompte des 7 626 modèles intégrés. L’importateur de fichiers personnels ne transfère aucun droit sur ces fichiers.

Les crédits de la bibliothèque intégrée sont consultables dans **Hub → À propos / Sources** et dans l’Inspecteur des ressources. Project / Assets se concentre sur les fichiers utilisables et leur organisation.

## Capture annotée de l’éditeur

- Interface, géométrie des annotations, historique et export PNG : code WarLike, Hardi Victor MBANVU.
- Capture DOM : [dom-to-image-more 3.11.0](https://github.com/IDisposable/dom-to-image-more), licence MIT, distribution npm conservée dans `vendor/dom-to-image-more/`, licence jointe dans `LICENSE.txt`. Le traitement s’effectue dans le navigateur, sans service de capture externe.
