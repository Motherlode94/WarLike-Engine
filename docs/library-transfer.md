# WarLike Library → Engine — transfert 3D réel (beta)

WarLike Library et WarLike Engine sont deux applications sur des domaines distincts. Leur `localStorage` et leur `IndexedDB` ne se synchronisent pas automatiquement.

## Parcours

1. Dans [WarLike Library Prefab Studio](https://warlike-library.pages.dev/prefab-studio.html), sélectionner un modèle **GLB** du catalogue (non un glTF JSON).
2. Créer un prefab de base ou une variante, et régler Transform, Collider et les composants souhaités.
3. Cliquer **Exporter pour Engine**. Cela produit `<id>.wlpkg.json` comprenant la configuration résolue, les **octets du GLB**, sa taille et son **SHA-256**. Taille GLB maximale : 25 Mo.
4. Ouvrir [WarLike Engine — Importer depuis Library](https://warlike-engine.pages.dev/asset-store/library-import.html).
5. Sélectionner le pack et cliquer **Vérifier et installer**. Engine refuse les paquets manipulés, les formats non GLB et les fichiers sans maillage.
6. Le modèle est enregistré en IndexedDB sur le domaine Engine avec un ID déterministe issu de son empreinte SHA-256. Un prefab natif est créé dans `warlike.prefabs.library.v1`. Ouvrir ou recharger Engine pour retrouver le modèle enregistré et le prefab.

Les personnalisations d'un prefab déjà importé ne sont pas écrasées. Une variante héritée est exportée avec les composants de son parent résolus ; Engine conserve les informations de provenance mais ne synchronise pas les modifications futures du parent Library.

## Limites vérifiées

- Le transfert manuel par fichier est opérationnel au niveau **code et tests**. Les tests visuels réels dans un navigateur et l'utilisation des modèles dans Play/Export doivent encore être confirmés.
- L'installation ne garantit pas de composants Animator, Collider de mesh, Rigidbody ou scripts complètement compatibles ; seule une collision simple est configurée automatiquement.
- Les fichiers GLB importés sont restaurés dans l'éditeur à partir d'IndexedDB. **Le pipeline d'export Web ne garantit pas encore l'inclusion de ces binaires externes.** Ne pas publier un jeu utilisant ces assets avant d'avoir validé le ZIP exporté.
- Les sprites 2D, textures externes, dossiers de dépendances et formats glTF multi-fichiers ne sont pas encore acceptés par cet importateur v1.
- Ce transfert **n'utilise pas de cloud ou compte utilisateur** : il fonctionne uniquement sur le navigateur d'import, via un fichier téléchargé explicitement.
