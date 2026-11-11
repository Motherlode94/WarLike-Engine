# Règles permanentes de développement — WarLike Engine

## Règle obligatoire WL-COMPAT-001 : rétrocompatibilité des projets et de l’interface

**Toute amélioration de WarLike Engine (UI, Inspector, Hierarchy, scène 2D/3D, moteur, assets, scripts, démos, composants et Hub) doit fonctionner avec les projets et sauvegardes déjà existants.** Cette règle s’applique aux nouveaux projets **et** à toutes les anciennes sauvegardes prises en charge. Une interface actualisée ne doit jamais être réservée aux nouveaux projets.

### Invariants non négociables

1. **Séparer données et présentation.** Les changements de menu, CSS, fenêtres, préférences, Inspector et disposition n’ont pas le droit de réécrire la scène, les entités, scripts, assets, animations, composants, sauvegardes ou paramètres de gameplay.
2. **Ne jamais effacer les projets pour résoudre un problème d’interface.** Ne pas appeler `localStorage.clear()`, ni supprimer les clés `warlike.hub.projects.v1`, `warlike.hub.project.*` ou les slots de sauvegarde de jeu pour une migration UI.
3. **Migration automatique, versionnée et idempotente.** Chaque changement de format durable comporte un numéro de version, une validation, une copie de secours et une migration qui ne s’exécute qu’une fois. Échec de migration = état initial conservé et erreur explicite ; jamais de destruction silencieuse.
4. **Respecter les préférences utilisateur.** Une nouvelle disposition par défaut peut être appliquée une seule fois lors d’une mise à niveau ; les changements manuels ultérieurs doivent rester persistants. Prévoir « Réinitialiser la disposition » et, si nécessaire, « Restaurer la disposition précédente ».
5. **Dégradation explicite.** Un composant ancien ou inconnu doit être conservé dans la représentation du projet. S’il n’est pas compatible, afficher une erreur ou un avertissement et proposer une migration ou un mode de lecture au lieu de supprimer ses données.
6. **Aucune prétention de compatibilité sans tests.** Ne pas marquer « compatible », « validé » ou « jouable » sans tests exécutés sur des sauvegardes antérieures représentatives et vérification du rendu en navigateur réel.

### Clés de stockage à protéger

- `warlike.hub.projects.v1` : index de projets.
- `warlike.hub.project.*` : projets et workspaces.
- `warlike.save.v1:*` : sauvegardes de progression.
- Assets importés et fichiers de projet exportés : conservation complète des données et des références.

Les préférences d’interface sont distinctes : `warlike.workspace.layout.v1`, `warlike.projectHeight`, `warlike.toolbar.expanded.v1`. Une migration de ces préférences ne touche **aucune** clé de projet ni de progression.

### Vérifications à exécuter pour chaque PR affectant l’interface ou le stockage

- Ouvrir une sauvegarde antérieure et une sauvegarde récente dans le même build.
- Comparer le nombre d’entités, leurs IDs, Transform, composants, scripts et chemins d’assets avant et après le chargement.
- Vérifier que la nouvelle interface apparaît sur les anciens projets sans action destructrice.
- Vérifier la persistance après actualisation, fermeture/réouverture et changement de projet.
- Vérifier la sauvegarde puis la réouverture et l’export du projet ; aucune perte silencieuse.
- Vérifier une migration rejouée deux fois (idempotence) ainsi que les sauvegardes corrompues, incomplètes ou inconnues.
- Tester au minimum un projet 2D et un projet 3D dans un navigateur réel, et documenter les résultats non validés.
- Exécuter les tests de régression adaptés, notamment `tests/legacy-editor-layout-migration.test.mjs`, et ajouter un test lorsqu’un nouveau bug de compatibilité est corrigé.

**Règle de livraison :** si l’un de ces points échoue, ne pas présenter la modification comme entièrement validée. Corriger, fournir une migration réversible ou signaler honnêtement la limitation.

### Application au code existant

- L’ouverture des projets passe par `js/core/project-hub.js` et `js/core/workspaces.js` ; ne pas les contourner avec une réinitialisation de l’interface.
- Les fenêtres et leur état sont gérés par `js/ui/docking.js`.
- La migration actuelle de l’ancienne disposition est versionnée et conserve une sauvegarde de l’ancien layout dans `warlike.workspace.layout.before-scene-first.v2`.
- Cette règle doit guider toute contribution humaine ou assistée par IA qui modifie WarLike Engine.
