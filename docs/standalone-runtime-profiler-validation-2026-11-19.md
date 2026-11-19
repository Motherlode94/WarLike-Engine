# Lecteur autonome et mesures de production — 19 novembre 2026

Le ZIP Web démarre maintenant par `js/runtime/bootstrap.js`, sans importer `editor.js`, le Hub, l’Inspector, l’historique ni les entrées de manipulation de scène. Les HUD et menus de jeu ont leur propre dossier runtime ; leurs anciens chemins restent des réexports compatibles. Le Play/Stop transactionnel est partagé par l’éditeur et le lecteur.

## Frontière du runtime

`scripts/build-player-manifest.mjs` calcule les imports statiques, dynamiques littéraux et workers référencés par URL. Il refuse les modules d’édition. `gameRuntimeFiles` n’exporte que cette liste de modules. Le HTML du lecteur contient uniquement le viewport et les interfaces du jeu, sans initialiser le stockage des projets ou le Hub.

Le renderer reste partagé avec l’éditeur. Certains chemins optionnels de manipulation passent par des services installés uniquement par l’éditeur ; ils ne sont pas installés dans le lecteur. Certaines feuilles de styles partagées contiennent encore des sélecteurs inutilisés. Cette étape ne prétend donc pas éliminer chaque ligne d’édition du renderer partagé.

## Profiler

F7 ouvre le panneau dans l’éditeur et le jeu exporté. Capture bornée à 600 images, remise à zéro, arrêt et téléchargement JSON `warlike.profiler.v1`.

- Intervalles RAF réels, FPS observés, médiane et p95 ; aucune confusion avec le pas de simulation plafonné.
- Temps CPU instrumentés : WarScript, scripts JavaScript locaux, composants, gameplay, animation, physique et rendu. Les temps inclusifs/exclusifs distinguent les appels imbriqués. L’exécution JavaScript isolée et le pilote GPU ne sont pas un profil CPU complet.
- Draw calls, triangles et points soumis au GPU, passes d’ombres comprises ; ce ne sont pas des objets uniques.
- Temps GPU uniquement si les extensions de requêtes asynchrones du navigateur fonctionnent, avec rejet des résultats disjoints. Sinon la donnée est indiquée indisponible ou en attente.
- Heap JS uniquement si l’API facultative du navigateur l’expose. Aucune estimation de VRAM.

Les mesures restent en mémoire et ne modifient pas les projets ou sauvegardes.

## Validation

Les tests ciblés locaux couvrent la frontière des modules, le HTML autonome, les mesures CPU/GPU, le Play/Stop transactionnel et la compatibilité des projets. Les vérifications de syntaxe et TypeScript sont exécutées séparément.

Le checkout local contient une partie des gros assets : onze tests de catalogue et le smoke d’export complet ne peuvent pas y passer faute de fichiers présents. La CI possède le dépôt complet et reste nécessaire pour ces vérifications.

Le scénario navigateur `scripts/test-complex-production-browser.mjs` est ajouté à la CI : 122 objets, 108 corps physiques, Avatar animé, modification par l’Inspector, sauvegarde, rechargement/réouverture, Play/Stop avec restauration exacte, téléchargement du ZIP, lancement sans éditeur, sauvegarde/reprise de partie, protection du stockage de projets et export des mesures. Les JSON et l’image du rendu sont conservés en artifacts. Ce scénario est une validation fonctionnelle Chromium/SwiftShader, pas un benchmark sur GPU utilisateur ni une simulation de 108 soldats avec IA.

Le test de référence parcourt également les onze thèmes et compare les couleurs calculées des contrôles visibles au seuil de contraste 4,5:1, sur un ancien projet dont les données doivent rester identiques.

À l’ouverture de la PR, la validation navigateur de cette nouvelle architecture reste à confirmer par la CI. Les performances d’une scène de production sur le matériel utilisateur, la mémoire GPU et la compilation C# native vers Web restent hors du périmètre démontré.
