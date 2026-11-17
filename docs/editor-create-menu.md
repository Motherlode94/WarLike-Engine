# Création dans WarLike Editor — GameObject et Project Browser

WarLike Editor possède **deux actions différentes** inspirées de Unity :

1. **＋ Créer → Ajouter à la scène** : crée immédiatement de vrais GameObjects dans la scène courante, sérialisés dans le projet et intégrés à Undo/Redo. Objets 3D, lumières, audio, Canvas et éléments UI, volumes physiques.
2. **Project Browser → ＋ Créer un asset** : crée un **document de conception JSON** dans le stockage navigateur associé à l'identifiant du projet. Le document est listé avec possibilité d'exporter son contenu ou de le supprimer. Il ne s'agit pas encore d'un asset runtime de type Unity AssetDatabase.

## Création de scène implémentée

- GameObject vide, personnage, rig de caméra (composant, **pas** caméra autonome).
- Cube, sphère, cylindre, cône, sol, rampe via les primitives natives de WarLike 3D.
- Point Light, Spot Light et Audio Source à partir des champs reconnus par le moteur.
- Canvas, Panel, Text et Button avec composants `uiCanvas`, `uiRect` et `uiElement`. Panel/Text/Button exigent un Canvas existant. **Le runtime interactif uGUI reste à achever : un bouton créé n'est pas automatiquement cliquable en Play.**
- Cube avec Rigidbody expérimental et volume Trigger à vérifier en Play ; ne pas présumer que chaque forme de Collider/réglage est pris en charge.
- Accès à WarNode / Blueprint.

La création 3D utilise le mode 3D du workspace. Dans le mode 2D, certaines primitives ne sont pas disponibles comme maillages et utilisent des entités 2D de base. Le catalogue ne prétend pas remplacer tous les outils Unity.

## Documents de projet : périmètre réel

Le menu crée des documents versionnés contenant un type et des propriétés initiales : Dossier, Scène, Material, Physic Material, Animator Controller, Animation Clip, Avatar Mask, Audio Mixer, Render Texture, Sprite Atlas, Timeline, Terrain Layer, Prefab, Shader Graph. **Ils ne sont pas encore reliés aux importeurs, au runtime, à l'Inspector ni au système de fichiers Cloud.**

Ils sont conservés sous `warlike.editor.assets.v1:<project-id>` dans `localStorage`, séparément des scènes et sauvegardes existantes. Pour les sauvegarder hors de ce navigateur, utiliser **Exporter** sur chaque document. La suppression est confirmée par l'utilisateur. Aucune migration destructive n'est effectuée.

## Suivis indispensables

- Intégrer les documents de projet dans un AssetDatabase versionné, avec GUID, dépendances et cloud, sans écraser les anciens projets.
- Éditer et réimporter les documents, lier Material/Animation/Prefab au runtime et activer leurs Inspectors.
- Ajouter le glisser-déposer depuis le Project Browser, les menus contextuels et les actions Rename/Duplicate.
- Compléter l'UI uGUI interactive et valider les composants physiques sur de vrais projets.
- Tests navigateur sur deux modes, Play/Stop, Undo, sauvegardes, migration et export.

Ne jamais présenter les documents JSON comme équivalents complets à des `.unity`, `.mat` ou `.controller` tant que leur exploitation runtime n'est pas implémentée.
