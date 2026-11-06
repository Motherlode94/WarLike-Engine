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

La condition de transition peut utiliser l’opérateur `trigger`. `Animator.ResetTrigger("attackRequest")` l’annule. `Animator.Play("attack")` force un état par identifiant ; un second argument facultatif règle la durée du forçage. En JS/TS, utilise les mêmes méthodes via `ctx.Animator` dans les callbacks. Les noms et types doivent correspondre aux déclarations du graphe. Cette API concerne le runtime Web ; elle n’ajoute pas une classe Animator au bridge C# natif.

Le fonctionnement s’inspire des [transitions Unity](https://docs.unity3d.com/6000.1/Documentation/Manual/class-Transition.html), avec un modèle WarLike propre. Il n’inclut pas encore le root motion, l’IK, le retargeting, les interruptions complètes de Mecanim ni l’édition de courbes Bézier.
