# Éditeur et construction de jeux — 28 novembre 2026

Le navigateur Project utilise une arborescence à gauche et un contenu défilant à droite, conformément à la [référence Unity Project](https://docs.unity.com/en-us/engine/6000.7/manual/unity-editor/editor-windows-views-reference/project-view). Les docks de scène et de fichiers sont également comparés à la [référence Godot](https://docs.godotengine.org/en/stable/getting_started/introduction/first_look_at_the_editor.html). Le thème choisi par l’utilisateur reste actif.

La hiérarchie présente des lignes de sélection et des icônes vectorielles ; les enfants restent alignés grâce à une colonne de dépliage réservée. Flèches, double-clic pour cadrer, visibilité et glisser-déposer continuent à agir sur les objets existants. La sortie d’inspection d’un asset ne reconstruit plus la hiérarchie entre pointerdown et click : le premier clic est conservé.

Le CSS du navigateur est regroupé dans `css/editor-project-browser.css`, les anciens styles concurrents sont retirés de `studio-polish.css` et `reference-workspace.css`. Les règles générales de palette excluent les contrôles qui appartiennent aux arbres. Les vignettes conservent leur hauteur et défilent ; elles ne sont pas compressées pour faire tenir toute la page.

Les commandes de placement sont repliées par défaut. Une caméra non sélectionnée ne laisse plus de rectangle vide ; son icône affiche le nom au survol ou à la sélection. Les contrôles caméra conservent leurs nœuds entre deux frames pour permettre clic, focus et clavier. Escape ferme le menu Placement en conservant la sélection ; les contrôles 3D disparaissent en 2D.

## Construire les trois jeux

Ouvrir un projet, sélectionner le modèle, puis **Blueprint → Bibliothèque** :

| Jeu | Kits et actions |
| --- | --- |
| Slime Adventure | `BP_Slime_Player` : contrôleur, capsule, santé, inventaire, progression RPG, Animator et commandes. Ajouter les comportements de quête, collecte, combat et progression disponibles dans la bibliothèque. |
| Course | `BP_Racing_Vehicle` sur la voiture ; `BP_Racing_Driver` sur le personnage conducteur. E pour entrer/sortir, puis commandes de conduite. Départ, checkpoints et arrivée sont des comportements séparés à placer sur le circuit. |
| Horreur | `BP_Horror_Player` : joueur FPS, inventaire, interactions, commandes et paramètres de lampe/batterie. Ajouter infectés, cachettes, zones de peur, portes et objectifs sur les objets correspondants. |

Après configuration, **Relier la caméra de jeu** attache explicitement la caméra active à l’objet. Le mode FPS/TPS suit son Camera Rig ; FOV, clipping et transform de la caméra, autres caméras et propriétés du personnage sont conservés. Sans caméra de scène active, le Camera Rig existant reste utilisable.

Les kits composent les composants natifs. Ils n’installent pas un second contrôleur ni un autre runtime. Les Blueprints et WarNode utilisent le même exécuteur de graphes ; WarScript et les modules JS/TS participent à la session partagée. C# reste exécuté par le pont .NET local ; le jeu Web n’exécute pas librement les scripts .NET et le contrôle de compatibilité d’export reste obligatoire.

Le mode Horror est initialisé par les composants sauvegardés, dans la session commune à Play et au lecteur exporté. L’ancien second démarrage de Horror dans `play-session.js` est supprimé. Stop réinitialise peur, batterie et activation transitoires ; les réglages du personnage sont conservés. La case de l’éditeur modifie maintenant ce composant sauvegardé. L et accroupissement se configurent dans Input Actions. Le nouveau kit sépare l’accroupissement de l’esquive ; une réapplication conserve les commandes déjà personnalisées.

## Validation

- `npm run typecheck` et suite Node complète.
- `tests/legacy-editor-layout-migration.test.mjs` : migration idempotente et clés de projet intactes ; tests de stockage : données invalides, sauvegardes et récupération.
- `scripts/test-editor-tree-browser.mjs` : projet v3 avec composant inconnu et hiérarchie imbriquée ; projet récent ; 2D/3D ; données JSON conservées après navigation, sauvegarde, rechargement, changement de projet et préparation de l’export.
- Géométrie du navigateur à 1440×900, 1920×1080 et 1366×768, dont un dock de 180 px. Défilement, recherche, inspection sans instanciation, liste/grille, agrandissement, clavier et menu Placement.
- Construction via les vrais boutons Blueprint : kit Horror, liaison Main Camera, démarrage sans interrupteur transitoire, déplacement W, lampe L et restauration exacte après Stop.
- `scripts/test-unity-workspace-browser.mjs` : docks, détachement, déplacement, rechargement, retour à l’ancrage et séparateurs.
- `scripts/test-camera-live-preview-browser.mjs` : véritable aperçu WebGL, et non fond uni.
- Captures et rapports : artefacts `editor-tree`, `unity-workspace` et `camera-live-preview` de la CI.

Cette validation porte sur les composants et les parcours indiqués. Elle ne constitue pas une certification commerciale des trois jeux complets, de tous les anciens formats ni de toutes les plateformes. L’exécution native libre de C# n’a pas été certifiée de bout en bout dans cette vérification navigateur.
