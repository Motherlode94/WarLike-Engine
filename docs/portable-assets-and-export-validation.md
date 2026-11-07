# Assets importés et validation de l’export Web

Les GLB importés sont conservés dans IndexedDB et restaurés avant l’ouverture du Hub. Le fichier `warlike-scene.json` transporte les GLB référencés par les deux workspaces et leurs scènes. L’import valide tous les modèles avant de les écrire dans une transaction IndexedDB.

L’archive du jeu contient les GLB utilisés dans `assets/imported/` et un catalogue de démarrage généré. Elle conserve les identifiants utilisés par les scènes, prefabs et instructions. Le jeu exporté ignore la bibliothèque personnelle du navigateur afin de charger ses propres ressources. Les sprites importés attachés aux objets restent dans leurs données de scène.

Les GLB locaux doivent intégrer leurs images et buffers. Les références à des fichiers voisins ne sont pas transportables depuis un fichier GLB isolé : l’export les refuse avec une explication. Limites : 25 Mo par GLB, 100 Mo de modèles importés par export. Les modèles distants non importés restent dépendants de leur URL.

Le lecteur conserve les primitives avec des extensions optionnelles compatibles, applique le défaut glTF de metallicFactor et utilise la matrice inverse transposée pour les normales. Une image indisponible ne supprime plus la géométrie entière. Les surfaces transparentes sont dessinées après les surfaces opaques du modèle et ne bloquent plus l’écriture de profondeur des objets suivants. Le rendu reste simplifié : cela ne constitue pas une implémentation complète du PBR glTF ou du tri de transparence entre tous les objets.

Les couches Animator proposent remplacement ou addition relative à la pose de repos, masque par os et descendants, activation, vitesse, boucle et décalage. Leur horloge continue pendant les transitions de l’état principal. Une couche ne modifie que les propriétés réellement animées par son clip.

## Reproduire la validation

```sh
npm run typecheck
npm test
node scripts/build-runtime-manifest.mjs
node scripts/export-validation-game.mjs
node scripts/test-exported-game.mjs
```

Le générateur utilise le vrai manifest du runtime et un personnage Kenney importé comme fichier local. Il décompresse l’archive sous `.validation-tools/exported-game/dist`. Le second script charge les modules de cette archive, exécute 200 frames, vérifie les vertices animés du GLB, le déplacement JavaScript arrêté par un mur, la rotation WarScript et la restauration de position, champs de script et variables de partie. Le stockage de ce test est un adaptateur mémoire qui exerce le même format de sauvegarde JSON.

Le 7 novembre 2026, le menu de cette archive a aussi été ouvert dans le navigateur de test. Une exception du catalogue d’animations absent des petits exports a été corrigée. Le contexte WebGL du navigateur était indisponible : le rendu GPU et une partie 3D interactive complète restent à vérifier sur un navigateur avec WebGL. Les tests CPU de géométrie et d’exécution ne remplacent pas cette vérification visuelle.
