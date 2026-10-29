# Blueprint Studio — de l’idée au jeu Web

Blueprint Studio permet de composer, tester et exporter un **petit jeu complet**
en utilisant le runtime JavaScript de WarLike, en 2D ou en 3D. Il réunit des
événements, des actions, des conditions, des scènes et une progression sauvegardable.

## Commencer avec une boucle jouable

1. Créer un projet dans le Hub, puis ouvrir **Exporter le jeu** ou
   **Blueprint Studio → Projet & export**.
2. Choisir **Créer un exemple de jeu complet**. La scène actuelle est conservée ;
   une nouvelle scène contient la mission **Trois lanternes**.
3. Cliquer **Tester**. Lire le dialogue et récupérer les lanternes avec **E**.
   L’objectif et le temps restant s’affichent à l’écran. Rejoindre le terminal
   d’extraction après la troisième collecte pour terminer la mission.
4. **Échap** ouvre la pause. Dans cet exemple, **F5** sauvegarde et **F9** recharge
   la partie. Les menus permettent de recommencer ou de revenir à l’éditeur.

L’exemple 2D utilise les personnages et accessoires du catalogue existant.
L’exemple 3D référence des modèles GLB réels : Cesium Man, Lantern et BoomBox.
Ces modèles distants demandent une connexion Internet et conservent leurs
licences propres.

## Composer les comportements

La colonne de gauche sélectionne les objets et leurs comportements. Un objet
peut porter son comportement historique et jusqu’à **32 comportements
supplémentaires**. Chacun possède son propre événement, son état « une seule
fois » et ses actions en attente. Ajouter un modèle depuis la bibliothèque crée
un nouveau comportement ; les autres restent en place.

Les cinq espaces de travail :

| Espace | Utilisation |
| --- | --- |
| Graphe | Relier événements, actions et conditions Oui / Non ; déplacer les nœuds et régler le zoom. |
| Instructions | Configurer une liste ordonnée d’actions, les conditions ET / OU et les paramètres du déclencheur. |
| Bibliothèque | Chercher des modèles par mécanique et catégorie, importer ou exporter un comportement JSON. |
| Projet & export | Gérer les scènes, la scène de démarrage, les variables initiales et l’export du jeu. |
| Débogage | Voir les variables en direct, les dernières instructions et les erreurs avec l’objet concerné. |

Dans le graphe, sélectionner un nœud affiche ses paramètres à droite. Cliquer une
sortie puis une entrée pour les relier. Un double-clic sur une connexion la
retire. Une condition dispose de sorties **Oui** et **Non** ; une sortie vide
termine ce chemin. **Réorganiser** remet les nœuds en ordre. Les cycles sont
refusés ; utiliser un événement à intervalle, un signal ou une attente pour
répéter une logique sans boucle bloquante.

Un graphe invalide bloque Play et l’export au lieu d’exécuter silencieusement une
ancienne compilation. Les actions conservent leurs noms internes pour assurer
la compatibilité des anciens projets.

## Progression et interface du jeu

- **Créer un objectif**, **Faire progresser un objectif**, **Terminer un objectif**
  alimentent un HUD réel. Le nombre à atteindre est configurable.
- **Démarrer un compte à rebours** affiche le temps et émet l’événement
  **Quand le temps est écoulé** une seule fois.
- **Victoire**, **Défaite**, **Pause**, **Reprendre** pilotent les menus de partie.
  La pause fige les déplacements, les chronomètres et les attentes. Un
  comportement explicitement actif pendant la pause peut reprendre la partie.
- **Afficher un dialogue** présente un personnage, un texte et un bouton
  Continuer qui émet un signal configurable. Ce dialogue ne suspend pas la
  simulation par défaut.
- Les événements supplémentaires suivent les changements de santé, la mort,
  une variable modifiée, un objectif accompli ou un chronomètre terminé.

## Scènes et sauvegardes

**Capturer la scène actuelle** conserve sa composition dans le projet. Ouvrir
une autre scène capture aussi la scène quittée. Le champ **Scène de démarrage**
choisit celle du build ; Play dans l’éditeur teste la scène actuellement ouverte.
L’action **Changer de scène** propose les scènes enregistrées. Les variables et
objectifs peuvent continuer entre niveaux ; les tâches de l’ancienne scène sont
annulées et les nouveaux déclencheurs de démarrage s’exécutent.

Une sauvegarde de partie conserve les entités, la santé, l’inventaire, les
variables, les objectifs, les chronomètres, le checkpoint et les déclencheurs
déjà exécutés. Elle est isolée par projet et par emplacement. Le rechargement se
fait entre deux mises à jour du runtime pour éviter de modifier une scène en
plein parcours de ses objets. Les sauvegardes incompatibles ou corrompues
produisent une erreur explicite. Elles restent dans le navigateur de l’utilisateur.

## Exporter un jeu jouable

**Exporter le jeu Web (.zip)** vérifie les scènes et prépare une archive contenant
le document de démarrage, le runtime, les styles, les ressources intégrées et la
configuration de jeu. Décompresser et servir le dossier en HTTP, par exemple :

```bash
python -m http.server 8000
```

Ouvrir `http://localhost:8000`. Le jeu démarre sur son menu, sans les panneaux de
l’éditeur. L’archive peut aussi être déposée sur un hébergement statique.

Le build Web est **expérimental**. Les GLB distants restent téléchargés depuis
leurs sources ; un GLB importé en mémoire sans ressource durable bloque l’export.
Les scripts C#/.NET et les binaires natifs non déployés ne sont pas incorporés
comme scripts de gameplay Web. Les règles de certains modes historiques et
les pipelines de rendu/animation restent expérimentaux. Ce parcours valide un
petit jeu, sans garantir tous les genres ni une compatibilité multi-GPU.

Pour les contributeurs qui ajoutent ou déplacent des fichiers du moteur,
exécuter `npm run build:runtime` avant de livrer. Le manifest est versionné et
les tests vérifient qu’aucun module JavaScript n’a été oublié dans le build.

## Vérification de la livraison

- 288 tests Node réussis, contrats TypeScript et syntaxe JavaScript vérifiés.
- Chromium : édition des paramètres, création de conditions, connexions Oui/Non,
  détection d’un cycle et refus de Play sur un graphe invalide.
- Missions 2D et 3D : progression, pause, sauvegarde, rechargement, victoire et Stop.
- Interface inspectée en thèmes clair/sombre et à 1 024, 1 280 et 1 600 px.
- Archive ZIP vérifiée puis servie depuis un dossier séparé : menu, partie,
  objectifs et victoire validés sans erreur JavaScript non interceptée.

Ces scénarios vérifient la logique 3D. Les téléchargements de modèles GLB distants
ont été indisponibles dans l’environnement de test ; leur affichage sur plusieurs
réseaux, navigateurs et GPU reste à vérifier.

## Fonctions réutilisables et données typées

**Blueprint → Fonctions → Nouvelle fonction** crée une définition commune à tous les objets et scènes du projet. Choisir un nom, des paramètres et un type de retour : `void`, `number`, `boolean`, `string`, `vector2` ou `vector3`. Les paramètres peuvent avoir une valeur par défaut constante. La fonction s’édite en instructions ou en graphe.

Dans un comportement, choisir **Appeler une fonction**, sélectionner la fonction et renseigner ses arguments. Chaque entrée propose une source : constante, variable globale, variable locale ou paramètre de la fonction actuelle. Les menus de données globales et de paramètres filtrent par type. Une référence est une donnée sérialisable, jamais du JavaScript à évaluer.

**Retourner de la fonction** termine l’appel. Pour un retour non `void`, renseigner la valeur retournée et, sur l’appel, le nom de la variable locale qui recevra le résultat. Une fonction non `void` doit effectivement retourner une valeur du type annoncé. Les variables locales et paramètres sont isolés entre appels ; `Attendre` conserve cette pile jusqu’à la reprise. Les variables globales déclarées et les variables locales typées refusent les affectations incompatibles ; le débogueur affiche l’erreur.

Exemple : une fonction reçoit `points : number`, fait **Modifier une variable** sur `score` avec la source **Paramètre → points**, puis retourne `points`. Une porte et un coffre peuvent appeler cette même fonction avec des quantités différentes.

Les fonctions sont sauvegardées avec le projet, incorporées au jeu Web et incluses dans l’export d’un comportement. L’import fusionne les définitions et refuse une collision d’identifiant avec une fonction différente. Limites : 64 fonctions, 16 paramètres, 16 niveaux d’appel ; récursion interdite. Il ne s’agit pas encore d’un éditeur de classes ou de connexions de données entre broches : les données se lient dans les champs de paramètres.

## Pause et exécution pas à pas

Sélectionner un nœud d’action ou de condition dans le graphe, puis **Ajouter un point d’arrêt** avant Play. La compilation conserve ce point d’arrêt. À son passage, la simulation s’immobilise **avant** l’instruction et ouvre l’onglet Débogage. Ce gel ne change ni l’état de victoire/défaite, ni le menu de pause du jeu.

Les commandes sont présentes sur tous les onglets de Blueprint :

- **Pause / F8** : geler la simulation.
- **Pas à pas / F10** : exécuter une instruction du comportement suspendu, puis rester en pause. Un appel entre dans la fonction ; un retour revient à l’appelant. Le temps du jeu et la physique restent gelés. Au pas à pas, une attente peut être franchie sans faire avancer le monde.
- **Continuer / F6** : reprendre les jobs et la simulation.

Les raccourcis s’utilisent lorsque la fenêtre Blueprint a le focus. Débogage montre les variables globales, les variables locales de la pause, les paramètres et la pile des fonctions, ainsi que la trace des instructions et les erreurs. Le nœud suspendu est encadré en jaune dans son graphe. Stop remet le débogueur à zéro. Le débogage est local à l’éditeur ; il ne constitue pas un débogueur distant pour les invités LAN.
