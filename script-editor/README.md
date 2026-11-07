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

Les fichiers **WarScript `.wls`** attachés au GameObject s’exécutent dans Play et l’export Web. **Vérifier / compiler** affiche leurs diagnostics avec ligne et colonne, même sans Monaco. Le bouton **▶ Tester WarScript** exécute immédiatement un aperçu local borné (Awake, Start, 60 Update / FixedUpdate / LateUpdate), avec logs, champs et position/rotation simulées. Cette simulation n'agit jamais sur les GameObjects de la scène réelle : collisions, physiques, signaux et animations complètes doivent toujours être vérifiés dans Play. Les champs publics se règlent dans l’Inspector. [Guide WarScript](../docs/warscript.md).

Le **C# `.cs`** est compilé en véritable assembly .NET par le bridge local : installer le SDK .NET 8 et lancer `start-warlike-csharp.cmd`. **Vérifier / compiler** compile les sources C# ouvertes ; enregistrer puis sélectionner **Utiliser Play C# natif** dans l’Inspector pour exécuter les MonoBehaviour. Play compile les sources du projet avant de charger la scène. [Guide C# natif](../csharp/README.md). Les modules **JavaScript** attachés s’exécutent directement dans le navigateur ; le **TypeScript** est compilé dans Script Studio puis le JavaScript produit est conservé pour Play et l’export. Python et C++ restent des sources pour leurs runtimes dédiés. [API des scripts JS/TS](../docs/script-languages.md).

Arrêter Play avant de synchroniser une sauvegarde de source ; le fichier et le brouillon restent conservés si le moteur refuse une modification pendant Play. La prochaine session repart du nouveau code et des valeurs enregistrées.

## Raccourcis

- Ctrl+S : enregistrer ; Ctrl+Shift+S : enregistrer sous.
- Ctrl+O : ouvrir un fichier.
- Ctrl+F / Ctrl+H : rechercher / remplacer.
- Ctrl+B : afficher ou masquer l’explorateur.
