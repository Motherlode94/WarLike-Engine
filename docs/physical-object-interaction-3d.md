# WarLike Engine — Physical Object Interaction 3D (Phase 2)

## Usage en Game View

1. Ajouter un **Collider 3D** et un **Rigidbody 3D** dynamique à un GameObject (la propriété `kinematic` doit être désactivée).
2. Ajouter le composant **Objet saisissable 3D** (`grab3d`).
3. Régler `maxDistance` (portée de saisie), `holdDistance` (distance devant le joueur) et `throwSpeed`.
4. Lancer Play en 3D, viser l'objet avec la caméra, puis appuyer sur **G** pour saisir.
5. **G** dépose l'objet ; **T** le lance dans la direction de visée.

Le test de visée utilise la requête de collision 3D existante : un mur solide situé devant l'objet bloque sa saisie. Le maintien déplace le collider par le moteur de déplacement à balayage, en ignorant uniquement le collider du porteur. Un objet porté devient temporairement `kinematic` ; il retrouve son type dynamique lorsqu'il est lâché, reçoit à nouveau la gravité et conserve sa masse pour le lancer.

Le moteur de jeu émet les **signaux WarNode** `grab3d:grab:<id>`, `grab3d:drop:<id>` et `grab3d:throw:<id>`. Utiliser une recette `event: signal` avec le signal exact, ou un pont commun d'événements dans un futur SDK. Les callbacks `OnGrab` WarScript ne sont **pas encore** exposés.

## Limites vérifiables

- Cette première version se limite au **Play 3D** et aux objets dynamiques possédant `grab3d`. Elle n'implémente pas encore les interactions physiques en 2D.
- Le déplacement par balayage du collider empêche de traverser un obstacle, sans créer une vraie contrainte physique articulée à deux corps (joint de préhension). Les rotations tenues, la manipulation à plusieurs joueurs et l'animation des mains restent à développer.
- La position de visée est calculée depuis les yeux du personnage en utilisant yaw/pitch (FPS/TPS partagent ce cap) : les caméras cinématiques fixes ou asymétriques exigent des tests supplémentaires.
- La commutation dynamique/kinematic peut nécessiter une reconstruction du monde Rapier au moment de saisir/déposer. Cela doit être mesuré en Play sur de vrais modèles.
- Les tests unitaires sont dans `tests/grab-physics-3d.test.mjs`. Les contrôles Play WebGL et **export Web autonome** ne sont pas encore certifiés.

Le code est exécuté dans le **runtime Engine**, pas uniquement dans l'éditeur, ce qui permet d'utiliser le même chemin d'exécution lors d'un export compatible.
