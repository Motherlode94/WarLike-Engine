# Intégrité des aperçus, prefabs et lumières — 26 novembre 2026

## Comportement corrigé

- Un aperçu Animation Studio multi-objets est temporaire pour **tous** ses objets. Sauvegarde explicite, capture de scène/workspace, export JSON/jeu et démarrage de Play restaurent les poses d’édition avant de copier les données. Les sauvegardes automatiques attendent la fin des aperçus. Le registre est dans le module de données partagé ; le lecteur autonome n’importe pas le studio d’édition.
- Le dock Animation conserve ses dimensions dans le panneau inférieur. Le gestionnaire des fenêtres flottantes ne tente plus de déplacer son contenu débordant, ce qui provoquait une récursion de redimensionnement.
- Les prefabs hiérarchiques nouvellement créés utilisent la version **4** et des références locales stables pour joints, sockets, caméras 2D/3D, Navigation Agent et cibles IK. Deux instances matérialisent leurs propres IDs. Les compositions imbriquées qualifient les clés ; les liens inchangés suivent les mises à jour de leur source. Apply/Revert et les variantes utilisent aussi les références de l’instance concernée.
- Les lumières ponctuelles et spots dont le GameObject est désactivé, détruit ou désactivé par une séquence ne sont plus transmis au renderer. Les spots appliquent les rotations X/Y/Z, en conservant l’inclinaison historique lorsque X/Z sont nuls.
- Le Directional Light propose **Cycle jour/nuit (historique)** ou **Transform · rotation et couleur**. Sans champ `lightDirectionMode`, les anciennes scènes gardent exactement le mode jour/nuit. Les nouveaux projets utilisent le mode Transform avec un soleil incliné. Désactiver toutes les lumières directionnelles d’une scène ne réactive plus le soleil global de secours.

## Conservation des données

Les lectures de prefabs v1/v2/v3 ne réécrivent pas la bibliothèque. Une référence locale ancienne est reconnue uniquement lorsqu’une clé `node-ID` correspond à un membre présent. Les cibles externes restent des références externes ; une cible locale explicitement manquante provoque un diagnostic avant instanciation. Les écritures conservent une copie de la bibliothèque précédente sous `warlike.prefabs.library.v1.before-v4`, une seule fois. Les projets, préférences de disposition et sauvegardes de progression ne sont pas supprimés.

Les nombres arbitraires dans les scripts ne sont pas interprétés comme des IDs. Les références de composants non déclarés, les changements structurels automatiques de prefab et l’animation de morph targets glTF restent hors de ce correctif.

## Vérification reproductible

- `npm test` : suite complète, plus régressions sauvegarde/réouverture, Play/Stop, export de poses temporaires, deux instances, variantes, liens imbriqués/croisés, retarget externe, anciennes données et lumières.
- `npm run typecheck`, `npm run build:runtime`, `node scripts/check-runtime-module-closure.mjs`, `npm run test:export`.
- `node scripts/test-authoring-integrity-browser.mjs` : véritables contrôles Animation Studio, sauvegarde, préparation de l’export, Play/Stop et réouverture pour anciens/nouveaux projets 2D/3D ; contrôle WebGL en 3D et captures sous `.validation-tools/authoring-integrity/`. Exécuté aussi par le workflow Engine integrity and Web export.
- `node scripts/test-reference-editor-browser.mjs` : anciens/nouveaux projets, données personnalisées, thèmes, Blueprint et sauvegarde portable.
- `node scripts/test-complete-3d-browser.mjs` : parcours FPS/TPS exporté et matériaux GLB.

Le navigateur de validation utilise Chromium et SwiftShader. Les résultats vérifient le comportement et les erreurs WebGL ; ils ne mesurent pas les performances sur le GPU de l’utilisateur. La variable optionnelle `WARLIKE_CHROMIUM_EXECUTABLE` permet au nouveau scénario de sélectionner un Chromium déjà installé.
