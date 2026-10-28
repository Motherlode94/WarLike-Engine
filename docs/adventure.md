# Aventure · Le phare oublié

Dans **Hub → Nouveau projet**, choisir **2D ou 3D**, puis **Aventure**. Dans un projet existant, **Game → Aventure · Le phare oublié** installe la scène ; Annuler restaure la scène précédente. Le genre, les composants, les objets, les séquences et les réponses sont enregistrés dans le projet et l’export Web.

Mira, gardienne des ruines, demande de rallumer un ancien phare. L’expédition relie exploration, conversation, document à lire, objet de quête, énigme, grille physique et victoire. Le template désactive le combat ; le composant **Aventure · Journal et quête → Combat autorisé** permet de le réactiver pour une aventure d’action.

## Jouer

| Commande | Action |
| --- | --- |
| ZQSD / WASD / flèches, Maj | Marcher, courir ; en 3D la direction suit la caméra |
| Clic droit en 3D | Orienter la caméra |
| E ou **Interagir** | Activer uniquement l’objet accessible le plus proche |
| 1–6 ou souris | Choisir une réponse de dialogue |
| Flèches haut / bas, Entrée | Parcourir puis valider les réponses |
| Échap pendant un dialogue | Fermer sans choisir une réponse de quête |
| J ou I | Ouvrir le journal : objectifs, objets de quête de l’équipe et indices |
| Échap dans le journal | Fermer le journal, sans mettre la partie en pause |
| Échap hors dialogue / journal | Pause, sauvegarde et reprise |
| F5 / F9 | Sauvegarder / charger la partie |

Le panneau d’aide peut se réduire par son bouton d’en-tête ; il se replie sur un petit viewport. Le journal et les longues conversations défilent. Pendant le journal ou une conversation, les commandes de déplacement et de combat sont bloquées ; les champs de l’éditeur conservent leurs raccourcis de texte.

## Parcours de la quête

1. Parler à **Mira**. Accepter, demander des informations ou remettre sa décision à plus tard ; il est possible de revenir.
2. Examiner le **Coffre des gardiens** pour révéler un indice dans le journal.
3. Ramasser la **Clé des ruines**. Un inventaire plein laisse la clé en place et permet de réessayer.
4. Examiner les **stèles nord et sud** puis sélectionner leurs symboles. Une erreur permet de réessayer ; un symbole déjà validé n’ajoute pas deux fois de progression.
5. Ouvrir la **Grille des ruines** avec la clé et les deux stèles éveillées. Sa collision bloque réellement le passage avant l’ouverture.
6. Rejoindre le **Cristal du phare** et interagir pour terminer les cinq objectifs par une victoire.

<details><summary>Solution des stèles</summary>

La formule est « L’ÉTOILE veille ; l’AUBE éveille ». La stèle nord attend **Étoile** ; la stèle sud attend **Aube**.

</details>

## Construire sa propre aventure

- **Aventure · Journal et quête**, à ajouter au personnage : titre, combat autorisé, notes et variables qui révèlent ces notes. Le journal lit les objectifs Blueprint existants.
- **Aventure · Interaction ciblée**, à ajouter à un PNJ, document, objet ou mécanisme : libellé de l’action et portée de 24 à 220 unités. Ajouter une séquence **À l’interaction** pour son comportement. Les collisions empêchent de parler ou d’interagir à travers un mur.
- **Afficher un dialogue**, dans Blueprint : texte, nom du personnage et jusqu’à six réponses. Chaque réponse possède un libellé et un signal. Les champs **Ajouter une réponse** et **Retirer cette réponse** évitent de devoir écrire du JSON. Une séquence **À la réception d’un signal** exécute la conséquence du choix.
- **Objet de quête possédé par l’équipe** et **Consommer un objet de quête partagé** vérifient et utilisent un objet appartenant à un personnage actif ou à un compagnon sauvegardé chez l’hôte.
- **Place disponible dans l’inventaire** protège un ramassage avant sa séquence. Les presets **Aventure · Dialogue à choix** et **Aventure · Objet de quête** fournissent des exemples réutilisables.

Les comportements de la scène sont des séquences éditables : objectifs, indices, clé, réponses de l’énigme, ouverture de la grille et victoire. Les décors utilisent les modèles et sprites intégrés. Les noms des éléments de décor sont masqués en Play pour garder la scène lisible.

## Sauvegarder et jouer en coop

F5 et le menu Pause conservent positions, inventaires, variables du récit, états des stèles et de la grille, objectifs et conversation encore ouverte. F9 ou **Continuer la sauvegarde** les restaurent. Une conversation restaurée reçoit un nouvel identifiant pour refuser une ancienne réponse restée en transit. Stop restaure la scène d’édition ; un nouveau Play suivi de F9 reprend la sauvegarde du navigateur et de cette adresse.

La [coop privée LAN](creative-studios-and-lan.md) utilise le serveur Python livré avec le moteur et les exports. Tous rejoignent l’adresse réseau de l’hôte. Les objectifs, indices et objets de quête sont partagés. Le joueur qui ouvre une conversation choisit les réponses ; les autres assistent au dialogue. Les commandes sont validées par le navigateur hôte : un invité ne choisit pas le dialogue d’un autre et ne transmet ni signal arbitraire ni modification de quête.

Les invités commencent sans copier les objets accumulés par l’hôte. Leur personnage et son inventaire sont conservés à la déconnexion ; utiliser un nom distinct et stable pour les retrouver. La clé d’un compagnon déconnecté reste utilisable par l’équipe pour ouvrir la grille. Les changements de scène et sauvegardes restent gérés par l’hôte. La coop partage une seule conversation à la fois ; elle vise jusqu’à quatre joueurs sur un réseau privé, sans serveur Internet autonome.

## Ressources et périmètre

- **Kenney Tiny Dungeon** : personnages, murs, porte et coffre 2D.
- **Kenney Platformer Art Deluxe** : terrain, clé et cristal 2D.
- **Kenney Castle Kit, Nature Kit, Survival Kit, Mini Dungeon et Tower Defense Kit** : ruines, grille, stèles, végétation, coffre, clé et cristal 3D.
- **Quaternius Ultimate Animated Character** : éclaireuse et gardienne 3D.

Les fichiers et textures utilisés sont inclus dans l’export, sans téléchargement de pack à effectuer par le joueur. Les décors d’arbres 2D réutilisent les rendus Kenney transparents déjà livrés dans le moteur. Les auteurs, liens de packs et licences CC0 restent disponibles dans l’Inspecteur et dans [Sources et licences](../SOURCES.md). [Kenney](https://kenney.nl/assets) · [Quaternius](https://quaternius.com/).

Il s’agit d’une aventure courte et éditable, avec une énigme et une scène. La narration est textuelle : ce template n’ajoute pas de doublage, de cinématiques faciales, d’IK, de monde ouvert à chargement continu ou de génération automatique de scénario. Les limites de rendu et de physique du moteur restent celles du [guide de fonctionnement](runtime-foundation.md).
