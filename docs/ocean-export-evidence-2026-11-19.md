# Ocean — réparation de la preuve visuelle d’export

Le contrôle `core-and-export` du run 44401265295 échouait à la capture pleine page de CHAMBRE 07 (`page.screenshot`, délai de 20 s), après réussite des assertions de chargement, physique, scripts et rendu.

Le test utilise maintenant l’événement existant `warlike:capture-frame` : le moteur renvoie le PNG du vrai canvas à la fin de son prochain rendu. La preuve ne dépend plus d’une capture du compositeur pleine page pendant le rendu continu sous SwiftShader. Un délai de 30 s et les vérifications de type/format/taille refusent une capture absente ou vide.

Toutes les assertions physiques et d’export restent actives ; les vérifications des missions et de l’ancien jeu 2D continuent après la capture. La PR reste une fondation Ocean : les calculs de flottabilité ne sont pas encore intégrés aux Rigidbody. Le nouveau passage de CI est nécessaire avant de considérer cet échec résolu.
