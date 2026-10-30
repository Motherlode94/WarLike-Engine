# Liens de vie · Les Tilleuls

Une première simulation de vie solo, jouable dans WarLike. Tu contrôles un personnage dans un quartier pixel art, tu prends soin de ses besoins et tu construis ses relations avec quatre voisins adultes.

[Jouer directement](https://warlike-engine.pages.dev/liens-de-vie.html). Cette page utilise le même runtime que le template, en mode jeu.

## Lancer une partie

Dans le **Hub → Nouveau projet**, choisir **2D → Liens de vie · Simulation**, créer le projet, puis **Play**. **Agrandir la scène** donne plus de place au quartier et au carnet. Les autres templates restent disponibles dans le Hub.

- **Clic / toucher le sol** : marcher vers ce point, en contournant les bâtiments.
- **ZQSD, WASD ou flèches** : déplacement direct ; **Maj** : courir.
- **Clic sur un nom ou une fiche** : carnet de ce voisin. L’action choisie fait rejoindre le voisin avant d’être exécutée.
- **Activités** : manger au café ou cuisiner, se reposer, prendre une douche, travailler et profiter du jardin.
- **P** : pause de la simulation ; **×1 / ×2 / ×4** : vitesse. Les ordres peuvent être préparés en pause.
- **Échap** : menu de la partie. **F5 / F9** : sauvegarder / charger. Les boutons du jeu, du menu et les raccourcis partagent le même emplacement `life` pour ce jeu.
- **Moi** : prénom et trois apparences Kenney au choix.

## Besoins et économie

Satiété, énergie, hygiène, lien social et plaisir évoluent avec le temps. Une activité doit être commencée à proximité du lieu ; ses effets et son paiement s’appliquent à la fin. Annuler une activité ne rapporte rien et ne dépense rien.

L’atelier ouvre de **08:00 à 18:00**, avec trois missions par jour, un salaire initial de **35 ¤** et une progression de savoir-faire. La fatigue et la faim peuvent empêcher de travailler. Le café ouvre de **07:00 à 22:00**. Les repas coûtent **8 ¤ au café**, **4 ¤ à la maison**. Repos, douche et jardin restent gratuits. Un panier solidaire au jardin restaure la satiété une fois par jour, afin de pouvoir reprendre le travail même avec un portefeuille vide.

## Relations

Maya aime la création, Noah la musique, Jade la nature et Éli la cuisine. Chacun possède des répliques et des destinations selon le moment de la journée. Les voisins se reposent de 22:00 à 07:00.

Les échanges modifient séparément le lien, la confiance et l’affection. Répéter immédiatement la même approche devient contre-productif. Écouter, s’intéresser aux goûts d’une personne, plaisanter, proposer un moment ensemble, offrir une attention ou s’excuser ont des effets différents. Une déclaration précoce peut être refusée. Une relation amoureuse demande assez d’amitié, de confiance et d’affection, puis une réponse positive ; Éli préfère une amitié.

Le carnet affiche quatre petits objectifs ainsi que les seize derniers souvenirs. Les sauvegardes conservent besoins, argent, jour, position, identité, relations, progression et action en cours. Les sauvegardes restent locales à ce navigateur ; exporter le projet et la partie reste conseillé pour changer d’appareil.

## Ressources et composants

Les **132 tuiles Tiny Town** de **Kenney** sont intégrées dans Project / Assets, avec auteur, pack, licence et source. Les décors du quartier sont composés de ces tuiles ; les personnages utilisent les sprites du pack **Tiny Dungeon** déjà livré avec le moteur. Les images sont embarquées et ne demandent aucun téléchargement pendant la partie.

- [Tiny Town · Kenney](https://kenney.nl/assets/tiny-town), [licence CC0 incluse](licenses/kenney-tiny-town.txt).
- [Tiny Dungeon · Kenney](https://kenney.nl/assets/tiny-dungeon), licence CC0.
- Copie des tuiles Tiny Town : [GeorgeQLe/assets-2d-city](https://github.com/GeorgeQLe/assets-2d-city), sous les termes de Kenney conservés avec les ressources.
- Assemblage des décors : `scripts/assets/build-life-art.py`, à partir des PNG originaux.

Les composants `lifeSim`, `lifeState`, `lifeNpc` et `lifePlace` sont sauvegardés et importés en JSON. L’Inspecteur règle besoins initiaux, argent, goûts des voisins, préférence relationnelle et points d’arrivée des lieux. Le même runtime est inclus dans l’export Web du jeu.

## Limites de cette première version

Quartier extérieur unique, sprites 2D, déplacements simples, répliques écrites et relations déterministes. Pas encore d’intérieurs visitables, construction de maison, enfants, mariage, ruptures, conversations générées ou multijoueur de simulation de vie. Les portraits sont des sprites statiques, avec orientation pendant la marche ; ce ne sont pas des personnages 3D.
