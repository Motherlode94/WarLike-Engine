# WarLike Math Core v1 — géométrie numérique robuste

## Objectif

Le noyau `js/core/math-kernel.js` consolide les opérations de mathématiques 3D indispensables au moteur : vecteurs, quaternions, matrices, rayons, géométrie triangulaire et pas de temps fixe. Il est **pur JavaScript**, indépendant du DOM et de WebGL, et est inclus dans le manifeste d'export autonome.

### Conventions sans ambiguïté

- **3D** : mètres ; vecteurs `[x,y,z]` ; matrices **column-major** (comme WebGL et le Scene Graph v2) ; angles de quaternion en **radians**.
- **4×4** : opérations `M × v`, translations dans les indices `12,13,14` ; `transformPoint4` divise par la coordonnée homogène, `transformDirection4` ignore la translation.
- Quaternions : ordre `[x,y,z,w]`, normalisation avant rotation, `slerpQuaternion3` sur l'arc court.
- En cas de données non finies, de quaternion nul, de rayon de direction nulle ou de matrice singulière : erreur explicite, plutôt qu'une chaîne de `NaN` dans la Scene View.

### Modules

| Domaine | Fonctions |
| --- | --- |
| Vecteurs | `dot3`, `cross3`, `add3`, `subtract3`, `scale3`, `length3`, `normalize3`, `distance3`, `reflect3`, `project3` |
| Quaternion | `quaternionIdentity`, `quaternionFromAxisAngle`, `quaternionMultiply`, `quaternionRotate3`, `slerpQuaternion3` |
| Matrix4 | `matrixIdentity4`, `multiplyMatrix4Math`, `invertMatrix4Math`, `transformPoint4`, `transformDirection4` |
| Géométrie | `rayAabb3`, `barycentric3`, `closestPointSegment3` |
| Simulation | `fixedStepAccumulator`, `clampMath`, `lerpMath` |

**Précision :** l'inverse utilise une élimination de Gauss–Jordan avec pivot partiel pondéré par l'échelle des lignes, puis vérifie le résidu `M × M⁻¹ ≈ I`. Cela améliore la robustesse pour de nombreuses hiérarchies de transforms, sans promettre de récupérer les matrices singulières ou mal conditionnées.

### Intégrations effectives

- Le **Scene Graph v2** utilise `multiplyMatrix4Math` et `invertMatrix4Math` pour multiplier et inverser les matrices de hiérarchie (Keep World, reparentage).
- Les **gizmos de translation** utilisent le produit scalaire du noyau pour déterminer le déplacement projeté.
- Le calcul des **obstacles de la caméra 3D** utilise la rotation de quaternion normalisée du noyau.
- L'export Web transporte le module avec le runtime et les autres dépendances.

### Validation

Les tests `tests/math-kernel.test.mjs` couvrent les identités vectorielles, les rotations à 90° et 180°, la slerp, les matrices TRS non uniformes, les inverses, les rayons face à une AABB, les normales d'impact, les coordonnées barycentriques, les segments et le pas de temps fixe.

Les tests numériques ne remplacent pas les validations de collision Rapier, de rendu GPU et de performance sur de grandes scènes. Le module est la **fondation mathématique**, pas un remplacement complet du système de physique 3D.
