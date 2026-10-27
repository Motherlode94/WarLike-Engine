# Conduite des véhicules dans WarLike Studio

La conduite utilise une simulation arcade simple partagée entre les prototypes 2D et 3D. Elle n'est pas encore une simulation pneumatique / suspension type AAA.

## Commandes Play
- **E** : monter ou descendre d'un véhicule à proximité (espace de sortie requis).
- **Z / W / ↑** : accélérer / avancer.
- **S / ↓** : freiner, puis enclencher la marche arrière.
- **Q / A / ←** et **D / →** : braquer.
- **Espace** : frein à main.

## Scènes 2D
Ajoute une ressource de la catégorie Véhicules, lance Play et approche le joueur.
L'Inspector **Vehicle Controller 2D** permet de modifier la vitesse max, l'accélération, le freinage, la direction, la résistance et le ratio de marche arrière.
Le freinage est progressif, la direction dépend de la vitesse et les collisions sont évaluées pendant le déplacement pour réduire la traversée des obstacles.

## Scènes 3D
Ajoute un modèle de catégorie **Vehicles** dans la bibliothèque Project, ou applique la recette **Course · Véhicule** à un GameObject 3D.
La fenêtre **Inspector → Vehicle Controller 3D** contient les réglages de conduite. Lance Play, approche le véhicule et utilise E. Un HUD indique la proximité du véhicule, la vitesse et les commandes.
Les véhicules et le personnage partagent le même état de scène. Lorsque Play s'arrête, les changements temporaires sont annulés par le système d'édition.

## Limites connues
- Les collisions 3D utilisent des volumes simplifiés, pas une géométrie de véhicule par roue.
- Pas encore de suspension, embrayage, différentiel, vrai drift par glissement latéral, boîte de vitesses avancée ni déformation de carrosserie.
- Les voitures GLB restent des maillages statiques : le braquage et la rotation des roues ne sont pas des animations squelettiques.
- L'IA trafic / véhicules ennemis et le réseau multijoueur nécessitent des systèmes distincts.
