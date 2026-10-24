# Architecture WarLike Engine — V0.3 (modularisation)
- `index.html` : document HTML et points d'ancrage des panneaux
- `css/style.css` : styles et responsive
- `js/editor.js` : point d'entrée sans logique métier
- `js/core/state.js` : état central de la scène
- `js/core/camera.js` : transformations écran/monde, zoom, recentrage
- `js/core/history.js` : snapshots undo/redo bornés à 80 étapes, **mémoire de session seulement**
- `js/core/scene.js` : entités, Play/Stop, JSON import/export
- `js/core/input.js` : pointeur, sélection multiple, raccourcis clavier
- `js/core/renderer.js` : rendu 2D Canvas et jeu de démonstration
- `js/ui/inspector.js` : hiérarchie et édition des propriétés
- `types/engine.ts` : interfaces TS préparatoires (non exécutées)
- `vendor/phaser/` : code source original Phaser et licence MIT (un utilitaire uniquement pour le moment)

## Tester
Cloudflare Pages sert le dossier racine sans compilation. Le serveur doit gérer les modules ES (`type="module"`). Lors du déploiement, vérifier que `js/editor.js` et les imports relatifs renvoient HTTP 200.

## Points à compléter
Moteur Phaser complet, tests automatiques navigateur, sauvegarde cloud, assemblage des composants, TileMap, scripting et migration TypeScript avec build. Le prototype actuel ne prétend pas encore offrir ces éléments.
