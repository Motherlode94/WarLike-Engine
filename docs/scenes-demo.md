# Scènes démo jouables

Dans un projet 2D ou 3D, choisir **Scènes démo** dans la barre d’outils ou **Game → Scènes démo jouables…**. Le chargement remplace la scène courante et reste annulable avec Ctrl+Z. Sauvegarder le projet pour conserver ses modifications. La fiche repliable en haut de la scène ouvre Play ou un comportement Blueprint.

| Scène | Parcours | Systèmes présentés |
| --- | --- | --- |
| Quartier du Canal · 2D / 3D | Accepter la mission de Mara, prendre le fusible devant l’atelier, réparer le relais au nord, secourir l’éclaireur et revenir à Mara. | Dialogue à choix, inventaire, conditions, signal, collision de barrière, lumière, son, FX, objectifs et victoire. |
| Première aube · 2D / 3D | Récolter sur les sentiers, construire le feu et l’abri dans la clairière, cuisiner et survivre jusqu’à l’aube. | Besoins, récolte, fabrication, placement libre, dangers nocturnes, sauvegarde et progression de survie. |
| Piste d’essais · 2D / 3D | Lire le briefing aux stands, monter dans le prototype et passer est → nord → ouest → arrivée. | Conduite, freinage, collisions, quatre checkpoints ordonnés, chronomètre et victoire. Un passage à pied ne valide pas la course. |
| Courrier des toits · 2D | Sauter sur les toits pour collecter trois colis, atteindre les gemmes de reprise et livrer au bureau. | Gravité, saut, caisses dynamiques, collecte, objectifs, reprise après chute et victoire. |

**Commandes :** ZQSD / WASD ou flèches pour se déplacer, Maj pour courir, E pour interagir ou monter/descendre du véhicule. En plateforme : Q/D ou flèches horizontales et Espace/Z/W pour sauter. En conduite : Espace pour le frein à main. J ouvre le journal des scènes d’aventure ; I ouvre l’inventaire/fabrication de survie. F5/F9 sauvegardent et chargent la progression dans le navigateur.

Les scènes utilisent les composants et le runtime ordinaires du moteur. Les quêtes, checkpoint et interactions sont stockés sur leurs objets ; ouvrir leur composant **Déclencheur** ou **Blueprint** dans Inspector pour les modifier. Les décors utilisent les ressources Kenney livrées avec le dépôt et des modèles GLB intégrés en 3D. La Jeep 2D conserve son illustration SVG historique. Les sols 2D sont des compositions reproductibles de tuiles Tiny Town CC0 : `python scripts/assets/build-demo-maps.py` (Pillow nécessaire).

Pour tester l’export, enregistrer le projet puis **Exporter le jeu**, décompresser et servir le dossier en HTTP. Le contrôle de compatibilité de l’export doit rester sans erreur. Les sauvegardes du navigateur sont propres à l’adresse où le jeu est servi.

## WarScript dans les quatre scènes

Le relais du quartier possède `Relais.wls` : après le signal de quête Blueprint, le script fait varier la lumière. `Prototype.wls` applique vitesse et freinage au véhicule du garage. `PremiereAube.wls` règle la vitesse du cycle de survie. `Coursier.wls` règle saut et sprint du contrôleur 2D. Sélectionner l’objet, déplier **WarScript**, modifier un champ public ou ouvrir **Modifier le WarScript**, enregistrer puis relancer Play. Ces sources et valeurs sont incluses dans l’export Web.

## Atelier du mouvement · 3D

Personnage Kenney contrôlable avec marche/course, saut et attaque déclenchée par WarScript. Trois stations organisées montrent le montage de poses et de courbes, une main et un regard IK sur mannequin Quaternius, et un déplacement par root motion. E lit les panneaux ; Window → Squelette et Animator ouvrent les outils d’édition. Tous les modèles sont intégrés et les données de la scène sont exportables.

L’Atelier du mouvement comporte aussi deux personnages de bibliothèque. **E** près du combattant propose ses coups et réactions ; **E** près du personnage d’interactions propose ses gestes. Leurs profils Animator sont construits à partir des vrais clips intégrés, avec leurs durées et des triggers pilotés par Blueprint.
