# Aventure · Le phare et la vallée

Dans **Hub → Nouveau projet**, choisir **2D ou 3D**, puis **Aventure**. Dans un projet existant, **Game → Aventure · Le phare et la vallée** installe les deux chapitres ; Annuler restaure le projet précédent. Le genre, les composants, les objets, les séquences et les réponses sont enregistrés dans le projet et l’export Web.

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
6. Rejoindre le **Cristal du phare** et interagir. Les cinq objectifs du phare sont terminés, puis le **Passage vers la vallée**, au sud du cristal, ouvre le second chapitre.

### Chapitre 2 · La vallée des échos

1. Parler à **Orin · archiviste** et accepter sa demande.
2. Lire les **Archives de la vallée** : le chant rejoint les indices du journal.
3. Prendre les deux lots de planches dans les **coffres nord et sud**. Les coffres ne se remplissent pas à nouveau en changeant de scène.
4. Interagir avec **Pont à réparer** : les deux lots sont consommés dans l’inventaire commun, les débris disparaissent et la passerelle apparaît. Les débris et les parois empêchent réellement le passage avant réparation.
5. Accorder les trois résonateurs dans le bon ordre. Une fausse note remet cette énigme à zéro ; une mélodie complète ne peut plus être annulée.
6. Réveiller le **Sanctuaire des échos** pour terminer les onze objectifs des deux chapitres.

Le panneau **Retour vers le phare** permet de revenir au premier chapitre. La grille ouverte, les objets récupérés, le pont réparé et les objectifs sont conservés. Le HUD affiche le chapitre et le prochain objectif ; dans le journal, les objectifs terminés se déplient à la demande.

<details><summary>Solution des stèles</summary>

La formule est « L’ÉTOILE veille ; l’AUBE éveille ». La stèle nord attend **Étoile** ; la stèle sud attend **Aube**. Dans la vallée : résonateurs **vert → bleu → rouge**.

</details>

## Construire sa propre aventure

- **Aventure · Journal et quête**, à ajouter au personnage : titre, combat autorisé, notes et variables qui révèlent ces notes. Le journal lit les objectifs Blueprint existants.
- **Aventure · Interaction ciblée**, à ajouter à un PNJ, document, objet ou mécanisme : libellé de l’action et portée de 24 à 220 unités. Ajouter une séquence **À l’interaction** pour son comportement. Les collisions empêchent de parler ou d’interagir à travers un mur.
- **Afficher un dialogue**, dans Blueprint : texte, nom du personnage et jusqu’à six réponses. Chaque réponse possède un libellé et un signal. Les champs **Ajouter une réponse** et **Retirer cette réponse** évitent de devoir écrire du JSON. Une séquence **À la réception d’un signal** exécute la conséquence du choix.
- **Objet de quête possédé par l’équipe** et **Consommer un objet de quête partagé** vérifient et utilisent un objet appartenant à un personnage actif ou à un compagnon sauvegardé chez l’hôte.
- **Place disponible dans l’inventaire** protège un ramassage avant sa séquence. Les presets **Aventure · Dialogue à choix** et **Aventure · Objet de quête** fournissent des exemples réutilisables.

Dans **Blueprint → Projet → Scènes du projet**, les boutons **Ouvrir** donnent accès aux deux scènes à éditer. L’action **Changer de scène → Conserver le groupe et l’état des scènes visitées** conserve les objets des zones et les inventaires du groupe ; **Entrée X / Y** définit la position d’arrivée. Les objectifs et variables restent communs. Les séquences Au démarrage / Une seule fois ne rejouent pas à chaque retour. Les séquences suspendues et les signaux de l’ancienne scène sont annulés pendant le voyage. La destination doit contenir un personnage jouable ; ses contrôles, son apparence et ses composants de quête servent de modèle aux voyageurs.

Les comportements des scènes sont des séquences éditables : objectifs, indices, clé, réponses de l’énigme, ouverture de la grille et victoire. Les décors utilisent les modèles et sprites intégrés. Les noms des éléments de décor sont masqués en Play pour garder la scène lisible.

## Sauvegarder et jouer en coop

F5 et le menu Pause conservent la zone courante, l’état des zones visitées, positions, inventaires, variables du récit, états des stèles et de la grille, objectifs et conversation encore ouverte. F9 ou **Continuer la sauvegarde** les restaurent. Une conversation restaurée reçoit un nouvel identifiant pour refuser une ancienne réponse restée en transit. Stop restaure la scène d’édition ; un nouveau Play suivi de F9 reprend la sauvegarde du navigateur et de cette adresse.

La [coop privée LAN](creative-studios-and-lan.md) utilise le serveur Python livré avec le moteur et les exports. Tous rejoignent l’adresse réseau de l’hôte. Les objectifs, indices et objets de quête sont partagés. Le joueur qui ouvre une conversation choisit les réponses ; les autres assistent au dialogue. Les commandes sont validées par le navigateur hôte : un invité ne choisit pas le dialogue d’un autre et ne transmet ni signal arbitraire ni modification de quête.

Les invités commencent sans copier les objets accumulés par l’hôte. Leur personnage et son inventaire sont conservés à la déconnexion ; utiliser un nom distinct et stable pour les retrouver. La clé d’un compagnon déconnecté reste utilisable par l’équipe pour ouvrir la grille. Un invité peut utiliser les panneaux de voyage : le navigateur hôte valide l’interaction et déplace tout le groupe. Les sauvegardes restent gérées par l’hôte. Les inventaires personnels, les compagnons déconnectés et l’identité des invités suivent le groupe, sans copier leurs objets. La coop partage une seule conversation à la fois ; elle vise jusqu’à quatre joueurs sur un réseau privé, sans serveur Internet autonome.

## Ressources et périmètre

- **Kenney Tiny Dungeon** : personnages, murs, porte et coffre 2D.
- **Kenney Platformer Art Deluxe** : terrain, clé et cristal 2D.
- **Kenney Castle Kit, Nature Kit, Survival Kit, Mini Dungeon et Tower Defense Kit** : ruines, grille, stèles, végétation, coffre, clé et cristal 3D.
- **Quaternius Ultimate Animated Character et Ultimate Modular Ruins** : personnages 3D et archives de la vallée.

Les fichiers et textures utilisés sont inclus dans l’export, sans téléchargement de pack à effectuer par le joueur. Les décors d’arbres 2D réutilisent les rendus Kenney transparents déjà livrés dans le moteur. Les auteurs, liens de packs et licences CC0 restent disponibles dans l’Inspecteur et dans [Sources et licences](../SOURCES.md). [Kenney](https://kenney.nl/assets) · [Quaternius](https://quaternius.com/).

Il s’agit d’une aventure courte et éditable en deux scènes, avec deux chapitres et onze objectifs. Les voyages chargent une scène à la fois ; ils ne réalisent pas de streaming de monde continu. Les anciens projets restent inchangés : créer un nouveau projet Aventure, ou installer la campagne via le menu Game, donne accès à la suite. Les sauvegardes de la première version à une scène restent lisibles ; elles ne migrent pas automatiquement leur scénario. La narration est textuelle : ce template n’ajoute pas de doublage, de cinématiques faciales, d’IK, de monde ouvert à chargement continu ou de génération automatique de scénario. Les limites de rendu et de physique du moteur restent celles du [guide de fonctionnement](runtime-foundation.md).
