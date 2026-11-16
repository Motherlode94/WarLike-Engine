# Modèles importés et jeux exportés

## Conservation

Les imports de fichiers GLB, de dossiers et d’URL sont conservés dans IndexedDB. Le moteur attend la restauration de cette bibliothèque avant d’ouvrir un projet. Les données restent propres à ce navigateur et à cette origine : pour transférer un projet, utiliser Export JSON.

Les exports JSON de scène et les sauvegardes globales du Hub incluent désormais les fichiers GLB importés référencés par leurs scènes. Import JSON restaure les modèles avant de résoudre les objets, avec les mêmes identifiants. Une archive de scène accepte au maximum 256 Mo de modèles ; chaque GLB reste limité à 64 Mo. Les quotas IndexedDB du navigateur restent applicables.

## Textures

Importer le dossier complet si le GLB référence des images voisines. Les PNG, JPEG et WebP sont intégrées au GLB avant conservation. L’import par URL télécharge également les images relatives autorisées par CORS, puis conserve une copie autonome du modèle. Une dépendance absente ou non prise en charge produit une erreur explicite. Les buffers de géométrie externes doivent être intégrés par l’outil d’export 3D.

Les modèles utilisent leurs couleurs par sommet `COLOR_0`, leur couleur et texture de base, les facteurs métallique/rugosité, les matériaux `KHR_materials_unlit` et les facteurs émissifs, y compris `KHR_materials_emissive_strength`. Les normales statiques tiennent compte des transformations non uniformes des nœuds. Les extensions requises non supportées sont refusées explicitement ; la présence d’une extension optionnelle sur une primitive ne supprime plus son maillage de base.

Le rendu charge aussi les normal maps (avec leur facteur `scale`), les textures métal/rugosité (canaux B/G linéaires), l’occlusion (canal R et `strength`) et les textures émissives (couleur sRGB). Chaque carte conserve son jeu d’UV et sa transformation KHR_texture_transform. L’occlusion agit sur l’éclairage ambiant. Les normal maps demandent OES_standard_derivatives ; son absence est signalée dans les diagnostics du modèle.

Ce rendu conserve son éclairage approximatif ; ce n’est pas une implémentation PBR glTF complète. Transmission, clearcoat, textures compressées et réflexion IBL restent hors de ce chantier. Les extensions de matériaux optionnelles non prises en charge produisent désormais un diagnostic ; les extensions requises inconnues bloquent l’import. La vérification visuelle des nouvelles cartes doit être exécutée dans Chromium.

## Export du jeu

Exporter le jeu crée une archive ZIP incluant les modèles importés effectivement utilisés dans `assets/imported/`. Les références conservent leurs identifiants. Le démarrage enregistre ces modèles avant d’initialiser l’éditeur et le lecteur. Les binaires GLB et leurs textures embarquées ne dépendent plus d’un fichier de session ou d’une URL `blob:`.

Rapier 0.21.0 est livré localement avec sa licence Apache-2.0 et son WASM intégré. Les modèles intégrés utilisés sont inclus ; les modèles GLB distants utilisés sont téléchargés et intégrés à l’archive avec leurs images PNG/JPEG/WebP, sous réserve des autorisations CORS et de leur licence. La compilation TypeScript dans l’éditeur continue de demander Monaco ; le jeu exporté utilise les scripts déjà compilés.

Les jeux Web exportés continuent d’exécuter WarScript et JavaScript/TypeScript compilé. Le C# natif nécessite toujours le bridge .NET local.

## Vérifications

`npm run test:export` génère une archive complète puis vérifie son runtime extrait sur 200 frames, sans dépendre du GPU. Le scénario navigateur reste disponible séparément.

- `npm test` : tests du moteur, imports, archive JSON, contenu ZIP, matériaux et virages root motion.
- `npm run typecheck` : contrat TypeScript existant.
- `npx playwright install chromium`, puis `npm run test:export:browser` : crée une véritable archive ZIP de l’atelier, la décompresse dans un dossier temporaire et teste le jeu dans Chromium. Toutes les requêtes externes sont bloquées. Le scénario vérifie le personnage importé, Rapier, le déplacement clavier, la collision, les scripts, les virages, la sauvegarde après réouverture et la restauration IndexedDB de l’éditeur. Il capture le menu, le jeu et la partie restaurée.

`WARLIKE_CHROMIUM` permet d’utiliser un exécutable Chromium déjà installé ; `WARLIKE_PLAYWRIGHT_MODULE` permet de sélectionner une installation Playwright externe au dépôt. Le chemin des captures temporaires est indiqué dans le résultat du test.
