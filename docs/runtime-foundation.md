# Physique, caméra et interactions en Play

Les déplacements 3D ordinaires, le vol, les ruées, les véhicules et les rigidbodies utilisent la même géométrie de collision AABB. Un déplacement est balayé jusqu’au premier contact sur chaque axe ; sa vitesse ne lui permet plus de sauter une paroi fine. Les autres axes restent libres pour glisser contre un mur.

Les objets désactivés par Blueprint, détruits, éliminés ou masqués dans un véhicule / bâtiment sont exclus des obstacles. Un objet simplement invisible peut rester un obstacle volontaire. Le réglage **Collisions actives** reste indépendant de son rendu. Une pénétration initiale est corrigée avant le déplacement, dans la limite de huit corrections par appel.

## Contrôleur de personnage 3D

Les commandes restent ZQSD / WASD / flèches, Maj pour courir, Espace pour sauter, Ctrl pour esquiver et F pour attaquer. La direction dépend de la caméra.

| Réglage dans l’Inspecteur | Valeur par défaut | Comportement |
| --- | --- | --- |
| Hauteur de marche | 0,28 m | Autorise une petite marche si la montée et le déplacement disposent de hauteur libre |
| Tolérance après rebord | 0,10 s | Un saut reste possible très brièvement après avoir quitté un bord |
| Mémorisation du saut | 0,12 s | Un appui juste avant l’atterrissage est exécuté au contact suivant |

Un saut maintenu ne se répète pas automatiquement. Les appuis brefs de saut et d’attaque 3D utilisent le tampon de touches. Un saut enregistré avant l’atterrissage peut partir à l’image suivante.

Le personnage conserve la position relative d’une plateforme sur laquelle il se tient. Un déplacement horizontal ou vertical modéré de cette plateforme le transporte en respectant les autres obstacles ; le saut détache ce suivi. Un changement de position de plus de quatre mètres en une image est traité comme une téléportation, sans transport du passager. Les plateformes peuvent être animées par les scripts ou les séquences de la scène.

## Caméra et combat

La caméra en troisième personne contracte immédiatement sa distance devant une paroi et la restaure progressivement après dégagement. Elle utilise les volumes physiques actifs, avec une marge autour du point de vue. Le changement de personnage suivi, de scène ou une téléportation de plus de douze mètres recadre la cible du suivi. Stop restaure la vue de travail.

Le tir FPS utilise un rayon contre les volumes réels de collision : le premier obstacle bloque une cible située derrière lui. Un objet désactivé ne bloque plus ce rayon. Le système conserve ses dégâts, recharges et bonus RPG. La portée du combat 3D et la vision tiennent compte de l’altitude ; une menace au sol ne peut pas frapper un héros éloigné en hauteur.

Les dialogues Blueprint et RPG, l’inventaire et le journal bloquent les commandes de mouvement, de combat, de pouvoirs et les ordres RTS à la souris. Les fenêtres gardent leurs propres commandes. La gravité et le monde continuent pendant ces interactions ; **Échap → Pause** suspend la partie. Les cas particuliers d’un mode de jeu peuvent gérer leurs interactions supplémentaires.

## Rapier optionnel

Le module Rapier continue de se charger uniquement lorsqu’il est activé. Le moteur intégré reste disponible sans cette dépendance réseau.

La synchronisation Rapier conserve les téléportations des corps dynamiques, leurs vitesses et les impulsions du gameplay. Le sol implicite à l’altitude zéro est présent dans les deux runtimes. Le module utilise la masse indiquée, la gravité de chaque corps et la détection continue des collisions sur les corps dynamiques. Un changement de dimensions, d’activation ou de configuration physique reconstruit le monde natif ; une position renvoyée par Rapier n’est pas réinjectée comme une téléportation à chaque image.

## Diagnostics Blueprint

Les nœuds associés à une erreur de graphe sont encadrés. Cliquer sur le diagnostic, ou le sélectionner puis appuyer sur Entrée / Espace, sélectionne le premier nœud concerné et le ramène dans la zone visible. Les erreurs d’exécution gardent leur propre indication.

Les commandes, événements et conditions du runtime ont des libellés français et des groupes explicites. Les conditions de distance à un point exposent X, Y/Z et la distance. La validation avertit d’une clé obligatoire vide et d’un signal personnalisé écouté sans émission explicite dans la scène. Ces avertissements ne bloquent pas Play : un script, une autre scène ou une intégration peut émettre un signal. Les signaux avec un espace de noms, comme `game:saved`, sont exclus de cette recherche conservatrice.

## Limites

Les volumes restent alignés sur les axes ; la rotation du modèle ne transforme pas sa collision en forme orientée. Ce travail n’ajoute ni ragdoll, ni articulations, ni collision triangulaire, ni fragmentation de maillage. Le transport de plateforme concerne le personnage 3D suivi ; les PNJ et corps empilés n’ont pas encore un système général de plateformes mobiles. Les contrôleurs WarLike restent distincts des corps Rapier et de son éventuel contrôleur de personnage natif.

Les données de contrôleur sont conservées avec la scène et l’export Web. Les sauvegardes de jeu conservent l’état de jeu ; Stop restaure la copie d’édition prise avant Play.
