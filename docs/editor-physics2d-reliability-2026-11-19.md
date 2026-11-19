# Éditeur et outils de physique 2D — 19 novembre 2026

## Comportements ajoutés

- **Stop** invalide les réponses asynchrones avant les nettoyages de scripts. Chaque nettoyage est tenté même si un autre échoue ; l’erreur reste signalée. Les GameObjects, composants anciens, sélection, identifiants, projet et caméra d’édition sont restaurés.
- La caméra 3D capture/restaure sa navigation dès le changement de Play, indépendamment de la prochaine image. Deux sessions rapides ne partagent pas une caméra de jeu résiduelle.
- Une manipulation 2D commencée avant Play ne reprend pas après Stop. Supprimer une sélection ne sélectionne plus un objet sans rapport.
- Les panneaux de l’Inspector restent ouverts pendant les modifications rapides ; leurs préférences se combinent sans réécrire les données des projets.

Les corrections de sélection Undo/Redo et de capture optionnelle de souris des PR #97 et #98 sont déjà dans la branche principale utilisée comme base.

## Collider 2D

Dans **Component → Ajouter un composant → Physics 2D**, ajouter un **Collider 2D**, puis choisir sa forme dans l’Inspector :

| Forme | Géométrie |
| --- | --- |
| Rectangle | Ancien comportement, dimensions du sprite si largeur/hauteur = 0. |
| Cercle | Centré sur le rectangle configuré ; rayon automatique = moitié de sa plus petite dimension. Un rayon positif remplace ce calcul. |
| Capsule | Rectangle à extrémités arrondies ; l’axe long suit la largeur ou la hauteur configurée. |

Les formes sont alignées aux axes du monde, indépendamment de la rotation du sprite. Le balayage des déplacements, la résolution des chevauchements, les événements Collision/Trigger et l’affichage Colliders utilisent la même géométrie. Les couches et masques restent actifs. Les anciennes données sans `shape` restent des rectangles ; aucune migration ni réinitialisation des projets n’est nécessaire.

Le calcul est un solveur de déplacements sans rotation physique : il ne remplace pas un solveur général de polygones, de couples et de contacts avec impulsions réciproques.

## Articulation 2D

Ajouter **Articulation 2D** crée le Rigidbody 2D nécessaire si absent. Ce Rigidbody ne peut pas être retiré avant son articulation.

- **Distance fixe** : contraint l’attache du corps à la distance configurée de l’ancre et retire sa vitesse radiale. La correction respecte les obstacles ; un mur peut empêcher la distance demandée.
- **Ressort amorti** : applique une force selon l’allongement, la raideur, l’amortissement et la masse.
- **Cible = ancre fixe** : Ancre X/Y sont des coordonnées dans la scène.
- **Cible = GameObject** : Ancre X/Y deviennent des décalages par rapport au centre de son collider. Une cible absente est signalée dans le diagnostic.

La cible sert d’ancre et ne reçoit pas de force réciproque. Il ne s’agit pas de joints pivot, de chaînes de corps ou d’un système articulé équivalent à Unity. Les contraintes tournantes et les polygones ne sont pas inclus.

## Zone de forces 2D

Ajouter **Zone de forces 2D** crée un collider Trigger si aucun collider n’existe. Un collider existant est conservé ; activer Trigger pour rendre la zone traversable.

- Force X/Y agit sur les Rigidbody dynamiques qui chevauchent réellement la forme.
- La masse détermine l’accélération ; l’amortissement réduit la vitesse de façon exponentielle.
- Le masque choisit les couches de corps affectées.
- Un corps statique, cinématique, désactivé ou hors du volume n’est pas accéléré.

Les corps de scène et le contrôleur plateforme utilisent le pas physique commun. Un contrôleur en vue du dessus possédant explicitement un Rigidbody est également simulé lorsqu’une articulation ou une zone de forces est utilisée. Les anciennes scènes sans ces nouveaux outils conservent leur mouvement.

## Diagnostic

Le panneau **Diagnostic physique 2D** affiche les corps, colliders explicites, triggers, articulations et zones de forces. Il montre la vitesse sélectionnée, l’écart de distance d’une articulation et les références/paramètres invalides. L’affichage **Colliders** dessine les contours réels, un segment de vitesse et les ancres des articulations.

## Validation et limites de livraison

Tests Node : anciennes collisions rectangulaires, traversée à grande vitesse, coins de cercles, capsules, contacts Trigger, couches, forces/masse, contraintes contre les murs, ressorts, contrôleur, sérialisation canonique et définition d’export. Les tests Play couvrent les nettoyages en erreur, les réponses natives tardives, deux sessions, l’historique et les données personnalisées anciennes. Les tests de préférences Inspector et de migration de disposition sont inclus.

Contrôle dans un navigateur réel, aperçu du code modifié : ouverture des projets sauvegardés **QA Engine — Blueprint 2D** et **QA Engine — Référence 3D** ; données JSON de l’objet sélectionné identiques avant/après Play/Stop ; création d’un nouveau projet 2D, choix Cercle conservé après actualisation/réouverture ; ajout d’articulation avec Rigidbody et zone de forces ; classement Physics 2D ; maintien du panneau ouvert après modification de son type.

La copie de travail utilise un téléchargement partiel du dépôt : les tests exigeant les bibliothèques d’assets non téléchargées ne passent pas localement. Les contrôles complets doivent être exécutés sur le dépôt entier. La parité visuelle d’un export ZIP hors ligne, les scènes complexes et les performances à grande échelle restent à valider ; cette modification n’est pas présentée comme entièrement validée ni comme une équivalence à Unity.
