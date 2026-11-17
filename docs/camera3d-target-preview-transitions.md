# Camera 3D — cible, prévisualisation et transitions (PR suite #59)

Cette extension conserve **une seule Camera de jeu** : `sceneCamera3d`. Les paramètres sont enregistrés sur le GameObject et partagés par la Game View, le moteur en Play et l'export Web.

## Sélectionner le personnage suivi

1. Sélectionner **Main Camera** dans la Hierarchy 3D.
2. Dans l'Inspector, choisir **Cible suivie** dans la liste des GameObjects présents dans la scène.
3. Choisir **Auto · joueur** pour utiliser automatiquement le premier joueur compatible, ou un objet nommé pour suivre explicitement cette cible.
4. Régler le mode **First Person** ou **Third Person**. La souris commande l'orientation dans les deux modes.

Une cible supprimée apparaît comme « Cible introuvable » dans le sélecteur : on peut en choisir une autre sans manipuler un ID brut.

## Transition entre caméras

La propriété `transitionDuration`, en secondes (`0–5`), est inscrite dans le composant `sceneCamera3d`. La transition entre deux caméras actives (priorité ou activation) ou lors du changement FPS/TPS du même GameObject utilise une interpolation en douceur de la position, de l'orientation et du FOV, **sans créer une seconde caméra de rendu**.

`0` signifie changement instantané. Cette interpolation n'est pas encore une timeline cinématique multi-plans : elle fournit la base runtime pour y raccorder ultérieurement WarNode/Timeline.

## Aperçu du cadrage dans la Scene View

En sélectionnant Main Camera, une vignette **CAMERA · CADRAGE FILAIRE** montre les volumes des objets projetés depuis la caméra sélectionnée. On peut activer/désactiver cet aperçu avec `showPreview`. Il est absent de la Game View et de l'export.

**Limite importante :** cet aperçu est un cadrage **filaire** calculé par la géométrie de la scène, **pas** un rendu WebGL miniature avec matériaux, éclairages ou post-traitement. Un véritable aperçu texturé demandera une seconde passe de rendu partageant le même pipeline WebGL sans dupliquer le système Camera.

Les tests sont dans `tests/camera-transition-3d.test.mjs`. La PR reste en brouillon jusqu'aux validations CI et navigateur.
