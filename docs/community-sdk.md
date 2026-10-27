# WarLike Open Ecosystem — SDK communautaire v1

Ce premier SDK est **déclaratif et local**. Il permet à un contributeur de distribuer des recettes Blueprint sous forme de fichiers JSON. WarLike les valide avant installation et les rend disponibles dans **Inspector → Quick Start • Gameplay Recipes**.

## Installation

1. Dans l'éditeur, ouvrir **Assets → Communauté · Plugins**.
2. Importer un fichier `.json` suivant l'API **1.0**. Exemple : [Field Tools](../examples/community/field-tools.json).
3. Sélectionner un GameObject → **Inspector → Quick Start • Gameplay Recipes → Communauté**.
4. Appliquer la recette. La séquence Blueprint validée est copiée dans l'objet : le projet reste utilisable même après désinstallation du pack.

## Format

Un manifest contient :
- `apiVersion` : `"1.0"`
- `id` : identifiant unique (`[a-z][a-z0-9-]{2,63}`)
- `version` : version `x.y.z`
- `name`, `author`, `description`
- `recipes` : entre 1 et 20 objets `{id,name,description,sequence}`

Chaque `sequence` utilise les déclencheurs Blueprint pris en charge (`start`, `interact`, `enter`, `exit`, `keyDown`, `interval`, `signal`) et **une liste réduite et validée d'instructions**. Les opérations destructrices, déplacements arbitraires d'objets, dégâts directs et exécution de code ne font pas partie de cette API.

## Sécurité et limites

- Aucun `eval`, import de JavaScript tiers, appel réseau, exécution C# ou accès au système de fichiers par les packs.
- Les textes de contribution sont affichés avec `textContent`, sans insertion de HTML fourni par la communauté.
- Taille maximale de 128 Ko ; 30 packs au plus dans le stockage local du navigateur.
- L'installation remplace un pack du même ID ; la désinstallation ne modifie pas les recettes déjà appliquées à des GameObjects.
- **Important :** il s'agit d'une première surface de contribution, **pas** d'une sandbox de code arbitraire ni d'un Marketplace distant. Les actions Blueprint autorisées peuvent modifier les variables et les objets de la scène pendant Play : les créateurs doivent vérifier leurs packs.
- Les packs sont stockés dans le navigateur actuel. La sauvegarde cloud, l'identité de contributeur, les signatures, la modération, les permissions et un SDK C# / WebAssembly complet sont des évolutions ultérieures.

## Contributions officielles

Utiliser des pull requests GitHub avec description, exemple de scène et tests. Une modification au noyau du moteur n'est pas chargée automatiquement depuis le Marketplace : elle exige toujours une revue et la réussite des vérifications GitHub Actions.

## Packs spécialisés 2D et 3D

Le catalogue intégré propose maintenant **Platformer Essentials 2D** (checkpoint, pièce, porte de fin de niveau) et **Adventure Essentials 3D** (terminal, caisse de matériel, objectif), en complément des exemples polyvalents.

La propriété facultative `modes` au niveau du manifest accepte `["2d"]`, `["3d"]` ou `["2d","3d"]`. Une recette peut aussi déclarer ses propres `modes`, à condition qu'ils soient inclus dans les modes de son pack. En l'absence de cette propriété, le pack reste compatible avec les deux modes, pour préserver les anciens manifests. L'Inspector affiche uniquement les recettes compatibles avec l'espace 2D/3D actif.

Le gestionnaire **Assets → Communauté · Plugins** permet de rechercher les exemples, prévisualiser les actions et permissions, puis confirmer l'installation. Une nouvelle version d'un pack doit être strictement supérieure à la version déjà installée (`x.y.z`) ; une version antérieure ou identique est refusée.

Ces packs sont des **comportements Blueprint**. Ils ne contiennent pas encore de textures, de modèles 3D, de sons ni d'exécutables tiers. L'import des assets communautaires nécessitera un format de paquet et des contrôles de licences, taille et contenu distincts.
