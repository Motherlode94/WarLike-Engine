# Survival : besoins, récolte et campement

Dans le Hub, choisir **Survival · Survie** en 2D ou 3D. Dans un projet existant, **Game → Survival · Scène de survie** installe la clairière ; Annuler restaure la scène précédente.

Le template contient un survivant, des arbres, de la pierre, des fibres, des baies, une source d’eau et des rôdeurs. Les objectifs guident vers un feu, un abri et la première aube. La partie continue après ces étapes.

## Boucle jouable

1. Se déplacer avec ZQSD / WASD ou les flèches et s’approcher d’une ressource. **E** ou **Récolter** prélève dans son stock partagé.
2. Utiliser **Boire** ou **Manger des baies** dans le HUD. Chaque action consomme une provision dans l’inventaire du personnage.
3. Récolter bois, pierre et fibres, puis fabriquer un campement. La construction apparaît sur un emplacement libre près du personnage ; si aucun emplacement ne convient, aucun ingrédient n’est débité.
4. Se tenir près du feu pour se réchauffer. **Attiser le feu** consomme un bois et ajoute 60 secondes de combustible, dans la limite de 600 secondes.
5. S’approcher de l’abri et choisir **Se reposer** pour récupérer 35 points de repos. Attendre 15 secondes avant un nouveau repos ; les autres actions restent disponibles après leur court délai.
6. Préparer la nuit : de 19 h à 6 h, la chaleur baisse hors du camp et les rôdeurs détectent plus loin et courent plus vite. Le froid extrême et la privation de nourriture ou d’eau causent de vrais dégâts.

| Recette | Coût | Effet |
| --- | --- | --- |
| Feu de camp | 4 bois + 2 pierres | Chaleur, cuisson et lumière 3D ; 180 secondes de combustible initial |
| Abri | 6 bois + 4 fibres | Protection contre le froid et possibilité de repos |
| Bandage | 2 fibres | Soigne immédiatement 25 PV, sans dépasser le maximum |
| Repas | 2 baies + 1 bois | Restaure 45 points de satiété ; nécessite un feu alimenté à proximité |
| Boire | 1 eau | Restaure 35 points d’hydratation |
| Manger des baies | 1 baie | Restaure 20 points de satiété |

Les quatre jauges vont de 0 à 100 : **satiété, hydratation, repos et chaleur**. Le sprint consomme davantage de besoins. Un repos inférieur à 15 réduit la vitesse de marche à 60 % ; la fatigue réduit aussi la réserve d’endurance disponible. Les recettes vérifient les ingrédients avant de consommer quoi que ce soit.

Le stock de chaque ressource est limité. Une ressource épuisée attend son délai de régénération ; un inventaire plein n’épuise pas la ressource. Les valeurs du template sont réglables dans l’Inspecteur. Le HUD se réduit par son bouton d’en-tête et reste défilable sur un petit viewport.

## Composants réutilisables

- **Survie · Besoins et fabrication** : ajouter à un personnage pour activer ses besoins, son inventaire et ses recettes. Régler les consommations et dégâts. Le bouton des prefabs installe les vrais modèles de campement Kenney pour les constructions 2D et 3D.
- **Survie · Ressource ou campement** : choisir `wood`, `stone`, `fiber`, `berries`, `water`, `campfire` ou `shelter`. Les ressources règlent stock, quantité et régénération ; le feu règle son combustible.
- **Survie · Cycle jour / nuit** : placer une seule instance par scène, avec heure, jour et vitesse du temps. Par défaut, 240 secondes de jeu passent par seconde réelle, soit une journée en six minutes. Le template commence à 17 h.

Un campement agit dans un rayon de 180 unités au sol, avec prise en compte de l’altitude en 3D. La récolte demande une distance de 135 unités au maximum. Le cycle ajuste l’éclairage 3D ; une teinte nocturne accompagne la 2D. Les valeurs du monde et des personnages sont sauvegardées avec les entités. La pause fige besoins, combustible et horloge ; Stop restaure la scène d’édition.

Blueprint propose **Récolter une ressource de survie**, **Fabriquer un objet de survie**, **Utiliser une provision ou un campement**, ainsi que les conditions **Besoin vital inférieur à**, **Campement construit** et **Nuits survécues au moins égales à**. Ces nœuds agissent sur le système jouable ; les anciens presets de variables restent compatibles pour d’autres prototypes.

## Coop sur votre LAN

Le [guide multijoueur local](creative-studios-and-lan.md) explique le lancement du serveur Python. Chaque joueur possède ses propres besoins et provisions. L’hôte traite les récoltes et fabrications ; le stock d’une ressource est partagé, et deux joueurs ne peuvent pas prendre simultanément sa dernière quantité.

Une construction d’invité est visible et utilisable par tous. Seul son constructeur paie les ingrédients. Les actions du HUD sont transmises comme commandes autorisées ; l’invité n’envoie pas de position, d’inventaire ou de construction arbitraire. L’hôte conserve la gestion de la pause, des sauvegardes et des objectifs de scène.

## Ressources et limites

La scène 3D utilise les modèles intégrés **Kenney Survival Kit**, **Nature Kit** et un personnage / rôdeur **Quaternius Ultimate Animated Character**. La 2D utilise des PNG Kenney existants et sept nouveaux sprites isométriques transparents, rendus à partir de la géométrie originale Kenney. Ils sont identifiés comme rendus dans le catalogue ; ils ne sont pas présentés comme des sprites dessinés par Kenney. Les crédits et liens des packs sont conservés dans leurs fiches.

Ces rendus sont reproductibles avec `scripts/assets/render-survival-sprites.cjs` et le renderer du moteur. Les sources sont les GLB déjà livrés, sous **CC0-1.0**. [Kenney](https://kenney.nl/) · [Survival Kit](https://kenney.nl/assets/survival-kit) · [Nature Kit](https://kenney.nl/assets/nature-kit) · [Quaternius](https://quaternius.com/) · [Sources du moteur](../SOURCES.md).

Ce premier axe survival n’inclut pas encore de construction modulaire libre avec aperçu de placement, de météo, de maladies, de farming, d’outils à durabilité, de poids d’inventaire ou de monde persistant sur serveur dédié. Les constructions se placent automatiquement autour du joueur et la scène reste limitée à 256 objets pour la coop. Le soleil et les besoins constituent une simulation de jeu réglable.
