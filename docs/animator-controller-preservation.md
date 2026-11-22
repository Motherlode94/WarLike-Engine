# Conservation des Animator Controllers

Le chargement conserve intégralement `gameProject.animatorControllers` : propriétés inconnues, entrées invalides, identifiants dupliqués et bibliothèques de plus de 64 ressources. Un format futur non tabulaire reste également conservé. Les sauvegardes antérieures sans cette propriété continuent à recevoir une bibliothèque vide.

Il n'y a aucun nouveau format durable ni migration : les données sources sont copiées sans normalisation destructive. Les objets, leurs graphes Animator compilables, leurs clips et leurs Avatars ne sont pas modifiés. Les sauvegardes et exports suivants conservent la représentation importée.

Seules les ressources valides possédant un identifiant unique sont proposées pour l'assignation et l'édition. Les autres restent en lecture seule, avec un diagnostic dans Project/Assets. La limite de 64 concerne la création ; elle ne tronque plus les imports. Une bibliothèque d'un format inconnu interdit la création pour empêcher son remplacement involontaire.

Les tests Node couvrent la restauration répétée, les métadonnées, les doublons, les formats inconnus et la conservation lors des opérations d'édition. Le scénario `scripts/test-project-animator-assets-browser.mjs` couvre deux sauvegardes/réouvertures réelles via le Hub, les changements de workspace et la préparation d'export, dans des projets 2D et 3D contenant des objets anciens et 65 ressources mixtes. Il vérifie aussi la visibilité du diagnostic et l'absence d'erreurs navigateur.

La validation locale Node, TypeScript et export doit être complétée par le workflow **Project Animator Assets Drag and Drop** avant de déclarer le parcours navigateur validé.
