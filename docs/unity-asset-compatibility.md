# Assets compatibles Unity dans WarLike Studio

WarLike Studio et Unity n'emploient pas le même format de scènes ou de prefabs.

## Bibliothèque Kenney CC0 (3D)

Dans **Projet → 3D → Assets compatibles Unity · Kenney CC0**, des modèles de vrais packs Kenney sont proposés (personnages, armes, véhicules, bâtiments et environnements). L'index provient du [catalogue public](https://github.com/Hidencod/tge-assets) alimenté par des assets [Kenney](https://kenney.nl/assets), déclarés CC0-1.0. La source du modèle et sa licence sont affichées dans l'aperçu.

Les références sont chargées au premier passage en 3D, puis les maillages GLB uniquement à la demande. Si le réseau ou CORS est indisponible, la bibliothèque externe peut ne pas se charger.

## Unity : exporter en OBJ

1. Dans la bibliothèque 3D de WarLike, sélectionne un **vrai modèle GLB**.
2. Dans l'aperçu, clique **↓ Exporter OBJ pour Unity**.
3. Enregistre le fichier OBJ, puis glisse-le dans le dossier `Assets/` d'un projet Unity.
4. Dans Unity, configure l'échelle, la collision, les matériaux et les composants selon tes besoins.

Unity sait importer les fichiers **OBJ** de manière native. Le convertisseur WarLike exporte les triangles et les normales du maillage statique normalisé utilisés pour la prévisualisation. **Il ne transfère pas les matériaux, textures, animations, armatures, blendshapes, prefabs ni scripts C#**. Pour conserver ces propriétés, télécharge les fichiers source de Kenney, utilise Blender pour faire un export FBX, ou utilise un importeur glTF dans Unity approprié au projet.

## Importer depuis Unity vers WarLike

L'import `.unitypackage` de WarLike extrait les ressources reconnues et peut enregistrer les GLB embarqués. Les fichiers `.fbx`, `.obj`, `.prefab`, `.unity`, `.mat`, `.anim` et les scripts Unity ne sont **pas** automatiquement convertis en objets exécutables par WarLike. Pour un FBX/OBJ, crée un GLB avec Blender pour le charger dans le moteur actuel.

## Compatibilité réelle

| Flux | État |
| --- | --- |
| Modèle GLB Kenney dans WarLike 3D | Oui, si téléchargé et compatible avec le chargeur |
| Modèle GLB WarLike exporté en OBJ puis importé dans Unity | Oui, géométrie statique seulement |
| `.unitypackage` dans WarLike | Extraction partielle |
| Prefabs/Scenes Unity natifs dans WarLike | Non |
| Animations/rigging et materials de GLB via OBJ | Non |
| Asset Store Unity import direct dans WarLike | Non |

Documentation Unity sur les formats pris en charge : https://docs.unity.com/en-us/engine/6000.6/manual/assets-and-media/asset-types/models/importing/importing-model-files
