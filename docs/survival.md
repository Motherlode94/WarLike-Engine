# Survival : Première aube · solo et coop LAN

Dans le Hub, choisir **Survival · Survie** en 2D ou 3D. Dans un projet existant, **Game → Survival · Scène de survie** installe la clairière ; Annuler restaure la scène précédente.

Le template contient un survivant, des arbres, de la pierre, des fibres, des baies, une source d’eau et des rôdeurs. Le scénario **Première aube** demande un feu alimenté, un abri, un repas cuisiné et une nuit survécue. Après l’aube, rejoindre le feu et l’abri termine l’expédition par une victoire. Ces objectifs sont communs à l’équipe et leurs conditions Blueprint sont modifiables. La défaite survient lorsque tous les survivants actifs sont à terre.

## Boucle jouable

1. Se déplacer avec ZQSD / WASD ou les flèches et s’approcher d’une ressource. **E** ou **Récolter** prélève dans son stock partagé.
2. Utiliser **Boire** ou **Manger des baies** dans le HUD. Chaque action consomme une provision dans l’inventaire du personnage.
3. Récolter bois, pierre et fibres, puis fabriquer un campement. **Placer · Feu de camp** ou **Placer · Abri** ouvre un aperçu du vrai modèle ou sprite. Déplacer la souris dans la scène, **R** ou **Tourner** pour pivoter de 90°, cocher **Grille** pour aimanter, puis clic gauche, **Entrée** ou **Poser** pour confirmer. **Échap** annule le placement sans mettre la partie en pause. L’aperçu vert indique un emplacement libre ; rouge indique le motif du refus. La portée est de 300 unités. Les joueurs, obstacles, constructions et grands colliders sont contrôlés de nouveau à la confirmation. Aucun ingrédient n’est débité avant une pose valide. Les constructions 3D se placent sur le sol à altitude zéro ; il faut redescendre avant de construire.
4. Se tenir près du feu pour se réchauffer. **Attiser le feu** consomme un bois et ajoute 60 secondes de combustible, dans la limite de 600 secondes.
5. S’approcher de l’abri et choisir **Se reposer** pour récupérer 35 points de repos. Attendre 15 secondes avant un nouveau repos ; les autres actions restent disponibles après leur court délai.
6. **Relever · 2 fibres** permet de secourir un coéquipier à terre à moins de 135 unités. Il récupère 35 PV et un minimum de besoins vitaux. Un survivant à terre ne peut pas agir ; tant qu’un autre est vivant, la partie continue.
7. Préparer la nuit : de 19 h à 6 h, la chaleur baisse hors du camp et les rôdeurs détectent plus loin et courent plus vite. Le froid extrême et la privation de nourriture ou d’eau causent de vrais dégâts.

| Recette | Coût | Effet |
| --- | --- | --- |
| Feu de camp | 4 bois + 2 pierres | Chaleur, cuisson et lumière 3D ; 180 secondes de combustible initial |
| Abri | 6 bois + 4 fibres | Protection contre le froid et possibilité de repos |
| Bandage | 2 fibres | Soigne immédiatement 25 PV, sans dépasser le maximum |
| Repas | 2 baies + 1 bois | Restaure 45 points de satiété ; nécessite un feu alimenté à proximité |
| Boire | 1 eau | Restaure 35 points d’hydratation |
| Manger des baies | 1 baie | Restaure 20 points de satiété |

Les quatre jauges vont de 0 à 100 : **satiété, hydratation, repos et chaleur**. Le sprint consomme davantage de besoins. Un repos inférieur à 15 réduit la vitesse de marche à 60 % ; la fatigue réduit aussi la réserve d’endurance disponible. Les recettes vérifient les ingrédients avant de consommer quoi que ce soit. Garder du bois pour cuisiner et attiser le feu : son combustible initial ne couvre pas toute la première nuit.

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

## Sauvegarder et reprendre

- **F5** enregistre la partie Survival dans le navigateur de l’hôte : besoins, inventaires, géométrie du camp, combustible, stocks, jour, recettes et objectifs. **F9** la recharge. **Pause / sauvegarde** ou **Échap**, puis **Sauvegarder**, fournit les mêmes commandes à la souris.
- **Continuer la sauvegarde** reprend la dernière partie depuis le menu de démarrage ou la pause. La sauvegarde de partie est distincte de la sauvegarde du projet d’édition : **Stop** restaure la scène d’édition, puis **F9** après un nouveau Play reprend la progression sauvegardée.
- Pour reprendre une coop, l’hôte ouvre son projet, crée un salon, puis presse **F9**. Les invités rejoignent avec leur nom précédent. Les inventaires et la santé des invités déjà présents au moment du chargement sont restaurés ; un invité déconnecté est conservé hors de la scène simulée et récupère son survivant à sa prochaine connexion.
- Un nouveau nom reçoit les provisions de départ configurées, jamais les ressources accumulées par l’hôte. Utiliser des noms distincts et stables : ce mécanisme privé n’est pas un compte utilisateur ni une authentification de personnage. Un invité parti ne perd pas les étapes communes déjà réalisées.
- Les sauvegardes sont locales au navigateur et à l’adresse du site. Les déplacer entre ordinateurs ou passer de Cloudflare au serveur LAN ne transfère pas automatiquement ces sauvegardes.

Les conditions Blueprint **Étape de campement partagée** (`campfire`, `shelter`, `meal`, `dawn`, `expedition`) et **Tous les survivants à terre** permettent de réutiliser cette boucle. La bibliothèque fournit les presets **Première aube**, **Équipe à terre** et **Relever un allié**. Les anciens nœuds de fabrication gardent leur placement automatique pour les scènes scriptées.

## Ressources et limites

La scène 3D utilise les modèles intégrés **Kenney Survival Kit**, **Nature Kit** et un personnage / rôdeur **Quaternius Ultimate Animated Character**. La 2D utilise des PNG Kenney existants et sept nouveaux sprites isométriques transparents, rendus à partir de la géométrie originale Kenney. Ils sont identifiés comme rendus dans le catalogue ; ils ne sont pas présentés comme des sprites dessinés par Kenney. Les crédits et liens des packs sont conservés dans leurs fiches.

Ces rendus sont reproductibles avec `scripts/assets/render-survival-sprites.cjs` et le renderer du moteur. Les sources sont les GLB déjà livrés, sous **CC0-1.0**. [Kenney](https://kenney.nl/) · [Survival Kit](https://kenney.nl/assets/survival-kit) · [Nature Kit](https://kenney.nl/assets/nature-kit) · [Quaternius](https://quaternius.com/) · [Sources du moteur](../SOURCES.md).

Ce premier axe survival n’inclut pas encore de construction modulaire de murs et toitures, de météo, de maladies, de farming, d’outils à durabilité, de poids d’inventaire ou de monde persistant sur serveur dédié. Le HUD propose un placement libre du feu et de l’abri ; les constructions modulaires en étages restent à développer. La scène reste limitée à 256 objets pour la coop, avec des places réservées aux trois invités. Le soleil et les besoins constituent une simulation de jeu réglable.
