# Physique, rendu d’environnement et Avatar humanoïde

## Laboratoire reproductible

Dans un **projet 3D**, ouvrir le navigateur des scènes natives et charger **Laboratoire 3D · Physique, GGX et Avatar**. Le chargement remplace la scène de travail et reste annulable par l’historique. Les 108 corps physiques, le sol, les murs, six sphères métalliques, le mannequin UAL et la caméra sont des GameObjects éditables.

Le mannequin utilise les clips réellement inclus dans le GLB UAL : marche sur la couche de base et conversation sur le haut du corps. Le laboratoire est un outil de validation ; sa présence ne certifie pas les performances d’un jeu complet.

## Stabilité et définition d’export

`npm run bench:physics` simule 108 Rigidbody avec le véritable Rapier WASM, en formes box/sphere/capsule, masses variées, empilements sur trois niveaux, murs, sol et CCD. Le même pas fixe est appliqué à la scène source et à sa définition d’export JSON reconstruite. Les trajectoires et vitesses sont échantillonnées ; valeurs non finies, traversée du sol ou divergence provoquent un échec.

Le rapport de cette exécution se trouve dans `docs/validation/physics-stress-108.json` : 1 200 pas de 1/60 s, soit 20 secondes simulées, aucune valeur invalide, écart maximal source/export nul dans cet environnement. La tolérance de contact du sol autorise un léger enfoncement numérique.

Les temps de pas mesurent Node + WASM sur cette machine. Ils ne mesurent ni le GPU, ni les FPS du navigateur, ni 108 soldats avec IA. La définition JSON n’est pas, à elle seule, la preuve d’un ZIP complet fonctionnant hors ligne.

## Reflets GGX

Le rendu d’environnement dispose maintenant d’une pyramide complète jusqu’à 1×1. Chaque niveau est convolué depuis la radiance source par importance sampling GGX ; les niveaux ne sont pas un simple redimensionnement de pixels RGBM. La cubemap diffuse reste une convolution séparée.

Le shader choisit le niveau selon la rugosité. `EXT_shader_texture_lod` permet un niveau explicite lorsqu’il est disponible ; le repli WebGL1 emploie un biais de LOD et peut donner une précision différente. Une approximation analytique du terme BRDF environnemental évite un neuvième sampler et respecte la limite de huit unités déjà utilisée par le renderer.

Références primaires : [Filament, éclairage d’environnement](https://google.github.io/filament/Filament.html) et [Epic, approximation de la BRDF pour plateformes contraintes](https://www.unrealengine.com/blog/physically-based-shading-on-mobile). Les exemples de code de cet article Epic sont explicitement réutilisables.

L’éclairage vient du ciel procédural ou du HDRI importé. Les sondes locales restent des volumes de teinte/influence du HDRI : cette modification n’ajoute pas de capture des objets locaux, de lightmaps ni de GI avec rebonds. Le format HDRI et son export restent inchangés.

## Avatar humanoïde et transfert

Dans le studio **Squelette**, ouvrir **Avatar humanoïde · correspondances et diagnostic**, puis **Détecter les os humanoïdes**. Vérifier les 15 correspondances requises et corriger les os avec les listes. Le profil reconnaît des conventions Mixamo, Blender et Unreal/UAL ; une ambiguïté n’est pas résolue en choisissant arbitrairement un os.

Le profil facultatif `animationRig.avatar` utilise le schéma `warlike.avatar.v1`. Les rigs existants continuent sans profil. La détection est une action explicite ; elle ne réécrit pas les anciens projets à leur ouverture. Un profil incomplet peut être conservé et désactivé. Play vérifie que les noms correspondent au modèle chargé et que la hiérarchie est cohérente.

Le transfert par Avatars utilise les deltas de rotation dans le repère mondial de la pose de repos. Il conserve les longueurs des membres cibles et adapte la translation des hanches au rapport de longueur des jambes. Les clips produits deviennent des courbes squelettiques ordinaires, conservées dans les scènes et les exports.

Utilisation : choisir le modèle/clip source dans **Transférer une animation entre squelettes**, vérifier les correspondances, puis **Créer le clip humanoïde avec Avatars**. Le transfert couvre les principaux os du corps, pas une animation complète des doigts ou du visage. Il exige des échelles positives uniformes et limite la quantité de clés. Vérifier visuellement les poses et les proportions avant utilisation en production ; il ne s’agit pas d’un système Humanoid équivalent à celui de Unity.

## Masques des couches

Dans Animator, chaque couche conserve son clip, poids, vitesse, décalage, boucle et mélange override/additif. **Masque humanoïde** propose corps entier, haut du corps, bas du corps, tête et bras. Le haut du corps commence à la colonne vertébrale et laisse les jambes à la couche de locomotion. Les anciens masques manuels par os restent disponibles.

Un masque inconnu n’est jamais transformé en masque de tout le corps. Un masque sémantique sans Avatar actif bloque Play/export avec une erreur explicite.

## Contrôles

Les nouveaux tests couvrent les niveaux GGX et leur radiance, les uploads GPU avec restauration de binding, les chaînes humanoïdes, les orientations des parents, les proportions, les masques réels, la sérialisation et les os absents. Le vrai GLB UAL est transféré et ses sommets skinnés sont déformés ; le petit rig Kenney, sans avant-bras ni pieds distincts, est explicitement refusé comme Avatar complet.

Le correctif de capture CHAMBRE 07 utilise l’événement de capture du véritable canvas après rendu, avec format PNG et délai borné. Les assertions physiques, ressources, missions et sauvegardes restent actives. La CI complète et le contrôle visuel de l’export restent nécessaires avant une validation générale.
