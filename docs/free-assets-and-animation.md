# Ressources gratuites, composants et caméra de jeu

Les ressources incluses sont des fichiers PNG, OGG et GLB d’origine. Elles sont
servies par le moteur ; les modèles utilisés sont inclus dans l’export Web. Les SVG historiques et les
primitives restent disponibles dans les packs explicitement nommés Prototypage.

| Auteur | Pack | Contenu intégré |
| --- | --- | --- |
| Kenney | Platformer Art Deluxe / Tiny Dungeon | 100 prefabs 2D, dont des personnages avec leurs images de marche originales |
| Kenney | 50 packs 3D complets | 4 716 modèles, matériaux, textures et animations disponibles dans les fichiers |
| Kenney | UI Pack | 40 PNG pour les interfaces et deux habillages de menus |
| Kenney | Interface Sounds / RPG Audio | 24 fichiers OGG utilisables et écoutables comme Audio Sources |
| Quaternius | 55 packs, dont Ultimate Monsters | 2 910 modèles, dont les 50 Ultimate Monsters avec leurs 506 clips au total |
| Quaternius | Universal Animation Library, Standard gratuit | Mannequin de référence et 43 animations ; les versions payantes Pro et Source ne sont pas incluses |

Les cartes indiquent l’auteur et la licence CC0. Les liens vers les packs sont dans Hub → À propos / Sources et dans l’Inspecteur.
Les dossiers `assets/free/kenney` et `assets/free/quaternius` contiennent les
notices, sources et empreintes SHA-256. Les modèles Quaternius ont été convertis
en GLB en conservant la géométrie, le squelette et les clips ; les grandes
textures sont partagées localement et limitées à 1 024 pixels. Les fichiers sources ne sont pas redessinés.

## Utiliser les animations 3D

Sélectionner un modèle puis ouvrir **Animator 3D** dans l’Inspector. Le menu
**Animation 3D** contient les clips réellement présents dans le GLB. Activer la
prévisualisation pour les lire dans l’éditeur. Choisir un clip manuellement
suspend le choix automatique des états ; réactiver **Transitions automatiques
selon le gameplay** pour retrouver repos, marche, course, saut et attaque.

**Correspondance des états de jeu** permet de choisir les clips de chaque état.
Les transitions mélangent les poses pendant 0,18 seconde. Les animations de mort
et les entrées/sorties de saut s’arrêtent au dernier instant. La pause du jeu
fige la lecture. La bibliothèque Quaternius permet de prévisualiser chacun des
43 clips sur le mannequin compatible fourni. Un squelette Kenney différent
utilise ses propres animations ; il ne reçoit pas silencieusement les rotations
d’un squelette Quaternius incompatible.

Le lecteur prend en charge les canaux TRS, LINEAR, STEP et CUBICSPLINE, les
quaternions, les matrices de liaison inverses et quatre influences par sommet.
Les sommets uniques sont déformés puis réutilisés par les triangles. Les textures
PNG/JPEG/WebP intégrées et les coordonnées UV sont conservées. Les morph targets,
Draco ne sont pas pris en charge. Les textures partagées du catalogue sont
incluses sur le même site et dans l’export des modèles utilisés. Pour les modèles volumineux, limiter le nombre de personnages animés
simultanément : le skinning utilise actuellement le CPU.

## Composants

L’Inspector suit l’objet sélectionné : Transform, affichage, animation, physique,
composants installés et comportements. **Ajouter un composant** fournit un seul
catalogue avec recherche, catégories et onglets Jeu Web / C# local. Les modèles
de gameplay restent dans un tiroir distinct. Les comportements affichent le
parcours Événement → Conditions → Instructions et ouvrent leur propre graphe.
Les propriétés spécifiques des véhicules 3D restent dans l’Inspector avant le
retour du parcours 3D.

## Caméra

En Play 3D, la caméra vise le personnage à sa hauteur, avec suivi amorti,
rotation au clic droit et distance à la molette. Elle se rapproche lorsqu’un
obstacle coupe la ligne entre le joueur et la caméra. La première personne suit
les yeux et utilise le verrouillage du pointeur. Distance, suivi et sensibilité
se règlent dans **Caméra de jeu**. En 2D, le suivi se centre dès le démarrage puis
reste amorti. Les vues de travail 2D et 3D sont restaurées à l’arrêt de Play.

Le détail des packs, des conversions et des archives indisponibles est dans
[la bibliothèque complète](complete-model-library.md).
