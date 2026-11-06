# Animation Studio et Animator

## Créer des clips de transformation

Sélectionne un objet et ouvre **Animation → Animation Studio**. Crée un clip, règle sa durée, puis **Enregistrer la pose** à deux instants de la timeline après avoir modifié la transformation de l’objet. Les losanges permettent de retrouver les clés ; le tableau permet de déplacer leur instant, changer leur interpolation ou les supprimer. Un nouvel enregistrement au même instant remplace la clé.

Les pistes disponibles sont X/Y, rotations, élévation et dimensions. X/Y et dimensions utilisent les unités de scène ; l’élévation utilise les mètres et les rotations les degrés. Ces pistes imposent une transformation absolue : elles conviennent à des portes, plateformes et séquences cinématiques. Pour un personnage physique, utilise l’Animator squelettique et son contrôleur de déplacement.

Les interpolations sont `linear`, `step`, `easeIn`, `easeOut` et `easeInOut`. L’interpolation de la clé de départ s’applique jusqu’à la suivante. Les canaux sans clé ne sont pas modifiés. Le panneau propose aussi renommage, duplication, suppression, boucle et vitesse.

**Aperçu** et le curseur appliquent une pose temporaire. **Stop**, le changement de sélection, la fermeture du panneau, Play ou une sauvegarde explicite restaurent la transformation initiale. La sauvegarde automatique attend la fin de l’aperçu. Enregistrer une pose pendant un aperçu capture la pose affichée.

Active **Lire ce clip dans Play** pour choisir le clip exécuté sur cet objet. Le même lecteur est inclus dans l’export Web. Un objet désactivé suspend sa lecture. Un clip sans boucle conserve sa dernière pose ; Stop puis Play réinitialise son horloge. Les clés et événements hors durée sont signalés avant Play et export.

**Signal Blueprint** ajoute un signal nommé à l’instant affiché. Il est émis dans Play au passage de cet instant, une fois par boucle ; l’aperçu de montage ne déclenche aucun comportement de jeu. Les séquences Blueprint le traitent au prochain passage de leur évaluation.

## Construire l’Animator

Ouvre **Animator · Graphe et mélanges** ou **Ouvrir Animator** depuis Animation Studio. Le graphe sélectionne les animations du sprite ou les clips réels du modèle. Les clips de transformation restent un composant distinct du graphe squelettique.

- Sélectionne le clip et la durée de chaque état. Le choix d’un clip GLB renseigne sa durée lorsqu’elle est disponible.
- **Temps de sortie** retarde une transition jusqu’au seuil normalisé : 1 correspond à une durée complète. Sur un état en boucle avec un seuil inférieur à 1, la fenêtre revient à chaque boucle ; sinon le seuil est un minimum avant l’évaluation des conditions.
- Le fondu utilise des secondes, ou une fraction de la durée de l’état source. L’ancienne animation continue d’avancer pendant le mélange.
- Le décalage règle la position normalisée de départ dans l’état cible.
- Les transitions sont évaluées dans l’ordre affiché. Le template d’attaque/pouvoir attend la fin de l’état avant le retour à la locomotion.
- Déclare des paramètres `float`, `int`, `bool`, `trigger` ou `string`. Pendant Play, leurs valeurs sont modifiables pour tester les conditions. Un trigger est consommé par la transition qui l’utilise.
- **Tester cet état dans la scène** permet un aperçu ; **Jouer cet état dans Play** le force temporairement et permet de le relancer depuis le début.

Les couches, masques d’os, mélanges 1D et événements FX/son/signal existants sont conservés. L’état actif et sa progression s’affichent dans le graphe. Les animations avancent sur les images de simulation acceptées : une pause ou l’attente d’une réponse native suspend leur horloge. En LAN, l’hôte anime les transformations ; les invités échantillonnent seulement leur Animator visuel.

## WarScript, JavaScript et TypeScript

Dans WarScript :

```csharp
Start() {
    Animator.SetFloat("alertLevel", 0.5);
    Animator.SetBool("armed", true);
    Animator.SetInteger("stance", 1);
    Animator.SetTrigger("attackRequest");
}
```

La condition de transition peut utiliser l’opérateur `trigger`. `Animator.ResetTrigger("attackRequest")` l’annule. `Animator.Play("attack")` force un état par identifiant ; un second argument facultatif règle la durée du forçage. En JS/TS, utilise les mêmes méthodes via `ctx.Animator` dans les callbacks. Les noms et types doivent correspondre aux déclarations du graphe. Cette syntaxe concerne le runtime Web. Le composant Animator C# natif est décrit plus bas.

Le fonctionnement s’inspire des [transitions Unity](https://docs.unity3d.com/6000.1/Documentation/Manual/class-Transition.html), avec un modèle WarLike propre. Les fonctions avancées ajoutées ensuite sont décrites ci-dessous ; leur modèle reste distinct de Mecanim.

## Studio Squelette : poses et courbes

**Window → Squelette · Poses, courbes et IK**, ou le bouton de l’Animator/Inspector, ouvre les os du modèle sélectionné. Il faut un vrai GLB contenant un rig. Crée un clip d’os, choisis un os puis sa position locale, rotation ou échelle. Modifie les trois valeurs et **Enregistrer la clé de cet os** à plusieurs instants de la timeline. Les rotations sont saisies en degrés et stockées comme quaternions. Les positions locales gardent les unités originales du GLB.

Pour position et échelle, choisis `CUBICSPLINE` pour obtenir une courbe Bézier/Hermite. Déplace les points et les poignées de tangente, ou saisis les tangentes entrantes/sortantes. Les rotations utilisent `LINEAR` (slerp) ou `STEP`, pour éviter les singularités d’une courbe d’angles Euler. La fenêtre peut être déplacée et redimensionnée ; sa liste d’os reste défilable.

L’aperçu d’os modifie seulement la pose rendue : les transforms de l’objet et les données GLB restent intacts. **Arrêter l’aperçu des os**, fermer la fenêtre, changer d’objet ou lancer Play annule cette pose temporaire. Les clips créés sont sauvegardés dans `animationRig.clips`, jamais dans le GLB source. **Lire les os dans Play** active le clip sans graphe ; pour l’utiliser dans un Animator, choisis son nom parmi les clips des états. Les clips intégrés et les clips créés partagent le lecteur de poses, les couches et les mélanges.

## Blend Trees 2D et sous-machines

Dans le détail d’un état, **Blend Tree 2D** ajoute des points `(x,y)` et deux paramètres. Les poids sont barycentriques dans un triangle local contenant le point ; à l’extérieur du domaine, ils sont projetés sur l’arête la plus proche. Les points de contrôle sont exacts et les poids normalisés. Les paramètres automatiques `moveX` et `moveY` expriment la vitesse locale en mètres/seconde. Ils peuvent être remplacés par des paramètres déclarés et alimentés en script.

**Sous-machines d’états** groupe les états, avec un état d’entrée et un parent facultatif. Les groupes peuvent être imbriqués jusqu’à la limite de 16. Une transition depuis un groupe concerne ses états descendants ; une transition vers le groupe atteint son entrée. Le graphe montre le nom des groupes. Les changements émettent `animation:machine:<id>:enter` et `animation:machine:<id>:exit`.

Chaque transition peut choisir une **Source d’interruption** : aucune, état source, état cible, source puis cible, ou cible puis source. L’option de priorité réserve l’interruption aux transitions placées avant la transition active. Les transitions depuis « Tous les états » sont évaluées d’abord. Lors d’une interruption, le fondu repart du mélange de poses en cours. Ce modèle reste propre à WarLike ; il ne charge pas les fichiers `.controller` Unity.

## IK et cibles

Le studio propose jusqu’à 12 contraintes :

- **IK à deux os** : racine, articulation et extrémité, qui doivent être trois os directement liés. La cible peut être une position locale ou un autre objet de scène, avec un décalage en mètres. Le pôle règle le côté du coude/genou et le poids mélange la correction à l’animation.
- **Regard IK** : oriente un os vers la cible avec un poids et un angle maximal. L’axe avant local est `+Z` par défaut ; les données `forward` permettent de l’adapter.
- **Poser le pied au sol** : ajuste la cible d’une chaîne de jambe au sol ou au sommet des colliders sous le pied. Cette fonction utilise les boîtes de collision du moteur ; ce n’est pas un raycast sur chaque triangle du décor.

Les contraintes sont appliquées après les clips et les couches. Une chaîne absente est signalée au démarrage. Les modèles avec des échelles non uniformes importantes demandent une vérification visuelle des articulations. Les cibles inaccessibles étendent la chaîne vers le point atteignable ; elles ne changent pas la longueur des os.

## Retargeting

Dans **Transférer une animation entre squelettes**, choisis un modèle source et un clip. La correspondance automatique utilise les noms normalisés uniquement lorsqu’une cible est unique. Vérifie et complète la table d’os, puis règle l’échelle des translations. **Créer le clip transféré** produit des pistes locales dans le squelette cible : le clip est éditable, autonome et exportable, sans dépendance au modèle source pendant Play.

Le transfert corrige les rotations par rapport aux poses de repos et met les translations à l’échelle. C’est un transfert par correspondance d’os, adapté à des chaînes compatibles, pas un solveur universel d’avatars humanoïdes. Un nombre d’os différent, des axes ou une hiérarchie très différents demandent des corrections et une vérification visuelle.

## Root motion

Choisis un os contenant une translation, les axes à extraire et **Appliquer le root motion**. Le déplacement du clip est calculé sur l’image de simulation, boucles comprises, retiré de la pose squelettique et appliqué au GameObject. L’option de collisions utilise le balayage du moteur. Le root motion est une extraction de translation ; l’extraction de rotation n’est pas proposée. N’additionne pas le déplacement d’un contrôleur au déplacement extrait sauf si cet effet est intentionnel.

## Animator C# natif

Un objet avec `animatorGraph` possède désormais un composant natif `Animator` accessible depuis `MonoBehaviour` :

```csharp
using WarLike.Runtime;

public class AnimationDriver : MonoBehaviour {
    Animator animator = null!;
    void Awake() { animator = GetComponent<Animator>()!; }
    void Update() {
        animator.SetFloat("pace", 2.5f);
        if (Input.GetKeyDown(KeyCode.F)) animator.SetTrigger("attackRequest");
    }
}
```

Les méthodes incluent `SetFloat/GetFloat`, `SetInteger/GetInteger`, `SetBool/GetBool`, `SetTrigger/ResetTrigger`, `Play`, `CrossFade`, `GetCurrentAnimatorStateInfo(0)` et `IsInTransition(0)`. Les paramètres doivent respecter les types déclarés. `Play` accepte l’état, la couche de base `0` et un décalage normalisé ; `CrossFade` reçoit une durée normalisée.

Le processus .NET exécute le script et renvoie ses commandes dans l’image native acceptée. Le navigateur évalue ensuite le graphe partagé. Les getters d’état reflètent le dernier état soumis au processus natif : il n’y a pas de deuxième simulateur d’animation concurrent en .NET. Ce pont demande la version du bridge contenant `animator-commands`. Les exports Web continuent d’utiliser WarScript, JS ou TS ; ils n’exécutent pas un processus .NET.

## Démo intégrée

Dans le projet 3D, ouvre **Scènes démo → Atelier du mouvement**. Le personnage utilise les vraies animations Kenney : ZQSD/flèches, Maj pour courir, Espace pour sauter et F pour déclencher l’attaque par WarScript. Trois stations expliquent les poses/courbes, la main et le regard IK sur un mannequin Quaternius et un acteur déplacé par son os root. Les composants et les scripts restent modifiables et l’ensemble est exportable.

Les limites indiquées plus haut remplacent l’ancienne liste de fonctions non disponibles : édition des os, courbes, mélange 2D, IK, transfert et root motion de translation sont maintenant intégrés. L’IK de corps entier, la reconnaissance automatique d’avatars et l’import de contrôleurs Unity restent hors du modèle proposé.

## Aperçu du personnage et montage image par image

Le studio Squelette affiche maintenant le **vrai maillage déformé et ses os** dans une vue de pose intégrée. Cette vue utilise les mêmes poses et contraintes que le lecteur d’animation, avec un dessin Canvas indépendant de WebGL. Elle reste utilisable pour monter les poses lorsque la scène principale ne peut pas démarrer son rendu WebGL.

- Glisse dans l’aperçu pour tourner la vue, utilise la molette pour zoomer et **Cadrer le personnage** pour réinitialiser la caméra. Les flèches, `+`, `−` et `Home` fonctionnent lorsque l’aperçu a le focus.
- Clique un os visible pour le sélectionner, ou filtre la liste par son nom. Les options **Maillage** et **Os** règlent l’affichage.
- L’aperçu affiche les couleurs des matériaux, sans textures ni effets de la scène. Il est limité en fréquence et à 24 000 triangles dessinés par image pour les modèles lourds ; il ne remplace pas le rendu final du jeu.

La timeline possède une cadence de **1 à 120 images/seconde**, un alignement sur les images et un instant numérique. Les boutons **Image précédente/suivante** avancent d’une image. **Clé précédente/suivante** parcourent les instants de toutes les pistes, en conservant exactement les temps des clips importés. Les instants des clés d’une piste sont aussi modifiables numériquement ; une collision avec une autre clé est refusée.

**Copier/Coller la valeur de pose** transfère la valeur locale de la propriété sélectionnée entre os compatibles. **Pose de repos de cet os** remet cette propriété à sa valeur de repos. Ces actions restent temporaires jusqu’à l’enregistrement d’une clé. **Enregistrer toute la pose** capture les transformations locales de tous les nœuds du modèle en une opération annulable ; la capture concerne le montage avant contraintes IK. Les limites de pistes et les noms d’os ambigus sont contrôlés avant modification.

Renommer un clip met à jour ses références dans les états Animator, mélanges 1D/2D, couches, correspondances d’animations et lecture automatique. La suppression d’un clip encore référencé est refusée avec la liste des usages. Annuler/rétablir conserve le clip, l’os et l’instant sélectionnés lorsque le même objet est restauré. Les chargements asynchrones d’anciens objets ou anciennes sources de transfert ne peuvent plus remplacer la sélection courante.
