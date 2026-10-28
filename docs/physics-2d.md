# Physique 2D dans WarLike

**Scène test 2D** installe un personnage Kenney, des plateformes, des obstacles et deux caisses dynamiques. Lance Play : le personnage et les caisses tombent sur le sol ; les colliders arrêtent leur mouvement.

## Reprendre une scène de plateformes existante

Les sprites de la catégorie Terrain sont solides par défaut. Le contrôleur automatique reconnaît les tuiles Kenney Platformer. Les objets déjà placés bénéficient donc des collisions sans devoir reconstruire le niveau.

Sélectionne le personnage et ouvre **Contrôleur de personnage 2D**. Choisis **Plateforme** pour forcer la gravité et le saut, ou **Vue du dessus** pour conserver le mouvement libre sur les deux axes. En plateforme : Q/D ou ←/→ pour avancer, Espace/Z/W/↑ pour sauter, Maj pour courir. Maintenir le saut ne déclenche pas une nouvelle impulsion après chaque atterrissage.

## Colliders et corps physiques

- **Box Collider 2D** : un rectangle solide, réglable indépendamment du sprite. Largeur ou hauteur à zéro suit les dimensions du sprite. Les décalages permettent d’ajuster le contact autour d’un personnage ou d’une image transparente. Le volume reste aligné aux axes.
- **Trigger** : laisse traverser le volume ; il ne sert pas de sol ou de mur.
- **Rigidbody 2D dynamique** : applique la gravité et les vitesses, avec rebond et friction. Un objet destiné à tomber doit avoir ce composant et un collider actif.
- **Rigidbody 2D cinématique** : utilise les vitesses configurées, sans gravité.
- **Corps statique** : reste à sa place et sert d’obstacle. Un collider sans Rigidbody est également statique.

Le bouton **Colliders** affiche le volume réellement utilisé : vert pour un obstacle solide, orange pour un trigger. Le mode Play restaure la scène éditable à l’arrêt ; les réglages des composants restent enregistrés dans le projet et dans l’export du jeu.

Les collisions utilisent des rectangles AABB et un déplacement balayé contre les bords des obstacles. Les objets partiellement placés dans un collider sont dégagés au début de la simulation. Les portes Blueprint qui activent ou désactivent une collision modifient aussi le collider 2D lorsqu’il existe.

Le solveur est une base de jeu de plateformes et de vue du dessus. Les polygones de collision, articulations, rotations physiques et contacts complexes demandent un solveur plus complet.
