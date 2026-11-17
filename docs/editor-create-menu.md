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

## Caméra native de scène

Le menu **Créer → Main Camera** ajoute un GameObject portant `sceneCamera3d`, sélectionnable dans la Hierarchy et par un marqueur de la Scene View. Le composant peut également être ajouté depuis le navigateur de composants. En Play, la Camera active de priorité la plus élevée produit la vue Game, avec projection FOV et distances de clipping. Trois modes sont disponibles dans Inspector : `fixed` (position/orientation du GameObject), `thirdPerson` (orbite contrôlée par la souris derrière la cible, distance/hauteur/offset), `firstPerson` (vue aux yeux de la cible, orientation souris). L'ancien nom `follow` reste reconnu comme alias de `thirdPerson` pour les projets déjà créés. `targetId` correspond à l'identifiant du GameObject ciblé ; à défaut, le personnage joueur est choisi.

En **FPS comme en TPS**, la souris oriente la vue et la direction horizontale de la Camera active sert de référence au déplacement du personnage. Le mode FPS utilise le regard à la souris avec pointer lock ; le mode TPS prend en charge la rotation par glisser-déposer du bouton droit. La différence se limite à la position et la distance de la caméra, pas aux commandes de déplacement. Les projets historiques sans Camera continuent à utiliser leur ancien rig de caméra. La `Scene View` de l'éditeur reste indépendante : ajouter une Camera ne remplace pas la caméra d'édition.

**À améliorer :** inspecteur de Camera avec sélecteur de cible par nom, gizmo frustum, prévisualisation miniature, gestion orthographique, culling masks, profondeur de plusieurs caméras, cinématique/Timeline et rendu 2D. Les modes et propriétés existants ne sont pas une équivalence complète avec Unity Camera.
