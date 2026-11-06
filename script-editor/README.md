# WarLike Script Studio

Éditeur Web de sources avec une organisation proche de VS Code : explorateur, onglets, Monaco Editor, coloration, diagnostics JavaScript/TypeScript, recherche/remplacement, minimap et raccourcis.

## Dans WarLike Engine

Ouvrir **Window → Script Studio**, un script dans Project → Scripts, ou l’édition C# du GameObject dans l’Inspector. **Autonome** ouvre le même outil dans une fenêtre séparée ; les sauvegardes sont synchronisées avec les sources du projet et l’objet choisi. Les modifications pendant Play sont refusées avec un message explicite ; le fichier déjà sauvegardé dans Script Studio reste disponible.

## Sans le moteur

Copier le dossier `script-editor` sur un hébergement statique ou le servir avec un serveur HTTP. Sa page `index.html` fonctionne seule : elle n’importe aucun module du moteur. Elle conserve ses sources et brouillons dans le navigateur. Monaco 0.57.0 est chargé depuis jsDelivr ; un éditeur texte reste utilisable si le CDN est indisponible.

## Fichiers sur le PC

Dans un navigateur compatible avec File System Access, sur HTTPS ou localhost :

1. **Ouvrir fichier** pour choisir le script et le lier à l’éditeur.
2. Modifier sa source ; **Ctrl+S** écrit dans ce même fichier. **Enregistrer sous** permet de lier un nouveau fichier.
3. Une sauvegarde dans VS Code ou un autre outil est relue automatiquement toutes les 1,2 secondes lorsque la page est visible, et lors du retour dans la fenêtre. L’outil doit rester ouvert et disposer de l’accès au fichier choisi.
4. Si le tampon contient aussi des modifications, un bandeau propose de charger le fichier ou de garder le tampon ; aucun écrasement automatique du travail en cours.

Sans File System Access, l’import et le téléchargement d’une copie restent disponibles. Ce mode ne surveille pas le fichier original. Le suivi d’un fichier n’est pas conservé après fermeture ou rechargement de la page : le sélectionner à nouveau pour rétablir son accès.

La sauvegarde actualise les **sources**, pas l’exécution du jeu. Le JavaScript importé n’est pas évalué automatiquement. Le C#, Python et C++ se compilent/s’exécutent dans leur environnement approprié ; la coloration C# ne constitue pas un compilateur C#.

## Raccourcis

- Ctrl+S : enregistrer ; Ctrl+Shift+S : enregistrer sous.
- Ctrl+O : ouvrir un fichier.
- Ctrl+F / Ctrl+H : rechercher / remplacer.
- Ctrl+B : afficher ou masquer l’explorateur.
