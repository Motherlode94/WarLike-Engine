# Physique 3D et personnages

Rapier 0.21.0 (Dimforge, Apache-2.0) est le moteur 3D sélectionné par défaut dans les projets. Le choix est sauvegardé dans le projet et transmis au jeu Web exporté.

## Réglages dans l’éditeur

- **Blueprint → Projet & export → Moteur physique 3D** : Rapier ou moteur interne. Le réglage dans Project / Assets reste également disponible. Relancer Play après un changement.
- **Ajouter un composant → Physique → Collider 3D** : boîte orientée, capsule verticale ou sphère. Dimensions, rayon et décalages sont en mètres ; `0` pour une dimension utilise la taille de l’objet. Le rayon de la capsule est plafonné à sa demi-hauteur.
- Les personnages ont une capsule automatique. Ajouter Collider 3D permet de la personnaliser. Le collider et le modèle suivent les trois angles du **Transform**.
- **Contrôleur de personnage 3D** : pente maximale, angle de glissement, marche, largeur minimale de marche, accroche au sol, marge de contact et masse de poussée. Marche, sprint, saut, coyote time et esquive utilisent le même monde Rapier que les corps dynamiques. Les joueurs LAN sont simulés dans ce monde sur l’hôte.
- **Rigidbody 3D** : masse, gravité, friction, rebond, vitesses, verrouillage des rotations et CCD. Les impulsions et téléportations de gameplay sont synchronisées ; les changements de forme ou de configuration reconstruisent le monde.

Les positions X et Z du plan utilisent 64 unités de scène par mètre ; l’élévation et les champs du collider sont en mètres. Les offsets du collider sont locaux au corps. La capsule utilise la hauteur totale, parties arrondies comprises. Les angles d’édition sont en degrés.

## Articulations

Ajouter **Articulation 3D**, puis choisir un autre corps de la scène :

- **Charnière** : rotation autour d’un axe local normalisé, avec limites angulaires optionnelles.
- **Rotule** : deux ancrages liés, rotation libre.
- **Liaison fixe** : position et orientation relatives contraintes.

Les ancrages sont relatifs au centre de chacun des corps, en mètres. L’ajout du composant crée, si nécessaire, un Rigidbody dont les rotations sont libres. Sur un Rigidbody déjà présent, décocher Verrouiller les rotations. Au moins l’un des corps doit être dynamique pour observer un mouvement. Une cible absente bloque Play avec un diagnostic. Les contacts entre les deux corps articulés sont désactivés.

## Chargement et limites

Le module officiel `@dimforge/rapier3d-compat@0.21.0` reste chargé depuis jsDelivr, via l’import map de `index.html`. Une connexion est nécessaire à son premier chargement ; les ressources Rapier ne sont pas incorporées à l’archive Web. En cas d’échec, le moteur interne prend le relais et le statut 3D le signale. Le moteur interne conserve ses collisions AABB ; il n’offre pas les capsules exactes, les pentes orientées ou les articulations de Rapier.

Le contrôleur Rapier effectue les translations et le glissement, pas une simulation de ragdoll. Les rotations des boîtes et des corps sont gérées par Rapier et affichées par le renderer. Le vol de super-héros, les véhicules, les contacts IA historiques et les requêtes caméra/tir gardent encore leurs solveurs spécifiques. Les colliders de mesh triangulé, moteurs d’articulation, ragdolls et véhicules physiques à roues ne font pas partie de cette livraison. Le runtime natif C# reste indépendant.

Les tests avec le vrai module WASM couvrent capsule/mur, mur orienté, pente douce en montée/descente, pente trop forte, petite marche, obstacle haut, saut, plateforme mobile, sphère, impulsion et les trois articulations. La validation visuelle 3D dépend de la disponibilité de WebGL.

## Sources

- [Rapier — contrôleur de personnage](https://rapier.rs/docs/user_guides/javascript/character_controller/)
- [Rapier — articulations](https://rapier.rs/docs/user_guides/javascript/joints/)
- [Code et licence Rapier](https://github.com/dimforge/rapier.js)
