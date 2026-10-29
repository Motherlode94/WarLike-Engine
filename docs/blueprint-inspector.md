# Hub, Mon Blueprint et Détails

Le Hub propose une vue **Grille / Liste**, un tri par date, nom ou dimension et les favoris. Le menu **⋮ → Dupliquer le projet** crée une copie indépendante des scènes, fonctions et réglages. Les projets restent stockés dans le navigateur ; conserver aussi une sauvegarde JSON.

Dans **Nouveau projet**, les cartes indiquent si le modèle fournit une scène jouable, une base à compléter ou un outil. Le formulaire conserve le choix 2D / 3D, le nom et les paramètres compatibles.

## Déclarer une donnée de l’objet

1. Sélectionner un objet et ouvrir **Blueprint Studio**.
2. Dans **Mon Blueprint → Variables de l’objet**, cliquer sur **＋ Variable**.
3. Dans **Détails**, définir son nom sans espace, son type, sa catégorie, sa description et sa valeur par défaut.
4. Cocher **Modifiable dans l’Inspecteur**, puis fermer Blueprint.
5. Dans l’Inspecteur, ouvrir **Blueprint · Valeurs d’instance**. Modifier la valeur pour cet objet ; **↶** rétablit sa valeur par défaut.

Exemple : déclarer `vitesse`, type **Nombre**, valeur par défaut `5`. Un objet peut avoir une valeur d’instance `8`. Les autres objets conservent leurs propres valeurs. Une variable privée ignore les anciens remplacements d’instance. Les noms réservés et les doublons sont refusés.

Ces données sont initialisées dans les variables locales de l’objet avant ses événements. **Définir / Modifier une variable locale** utilise leur nom. Les références **Variable locale** peuvent les lire dans les champs typés. Les fonctions partagées gardent leur propre espace local : passer une donnée d’objet comme paramètre de fonction pour l’utiliser dans cette fonction.

Les types disponibles sont nombre, booléen, texte, vecteur 2D et vecteur 3D. Les vecteurs se saisissent avec des nombres séparés par des virgules. Le renommage met à jour les lecteurs, les affectations et les conditions locales des comportements de l’objet. Les valeurs et leurs définitions suivent les projets, les copies d’objets, les sauvegardes JSON et l’export Web.

## Organiser et vérifier un Blueprint

**Mon Blueprint** sépare graphes d’événements, fonctions du projet, variables de l’objet et variables globales. Sa recherche filtre les membres. Les nouveaux comportements s’ouvrent directement sous forme de graphe ; les anciens conservent leur représentation jusqu’à leur conversion explicite.

**Ajouter un nœud** ou le clic droit dans le graphe ouvre une palette recherchable. La sélection d’un nœud affiche ses propriétés dans **Détails**, avec recherche et commentaire. Le bouton **Cadrer · F** centre la sélection ; glisser avec le bouton du milieu ou le bouton droit déplace la vue. Les points d’arrêt, la pause et le pas à pas restent disponibles.

**Compiler** vérifie les connexions, les fonctions et les diagnostics des comportements, puis affiche les résultats en bas. Une vérification réussie ne remplace pas un essai en Play. **Enregistrer** conserve le projet nommé dans le Hub.

Dans l’Inspecteur de scène, la recherche trouve les propriétés et ouvre les catégories correspondantes. **Blueprint** filtre les comportements et valeurs exposées ; **Tout déplier / Tout replier** organise les catégories.

## Portée de la référence Unreal

L’organisation s’inspire des panneaux [My Blueprint](https://dev.epicgames.com/documentation/en-us/unreal-engine/my-blueprint-panel-in-the-blueprints-visual-scripting-editor-for-unreal-engine), [Details](https://dev.epicgames.com/documentation/en-us/unreal-engine/details-panel-in-the-blueprints-visual-scriting-editor-for-unreal-engine) et des [variables modifiables par instance](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-variables-in-unreal-engine) documentés par Epic Games. Le code et le runtime sont ceux de WarLike. Il n’y a pas d’import de classes Unreal, d’héritage de classes Blueprint ou de compatibilité avec les fichiers `.uasset`. Les définitions actuelles sont propres à chaque objet et les fonctions sont partagées au niveau du projet.
