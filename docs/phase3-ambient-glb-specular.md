# WarLike Engine — Phase 3, réflexion ambiante des matériaux glTF

Le shader WebGL de production conservait déjà la BRDF GGX / Smith / Fresnel Schlick sur le soleil, les lumières ponctuelles, les spots et la lampe de poche. Ce lot ne modifie **pas** ces calculs directs.

## Modifications

- Le rendu de la lumière hémisphérique indirecte utilise désormais **le vecteur réfléchi de la caméra** pour choisir la couleur du ciel/sol.
- Le **Fresnel indirect dépend de l'angle de vue**. Les métaux reçoivent une réflexion ambiante colorée, tandis que les diélectriques préservent leur diffuse.
- La **rugosité** réduit l'intensité spéculaire ambiante : les surfaces lisses conservent davantage de reflet que les surfaces rugueuses.
- L'occlusion ambiante GLB est conservée sur les termes indirects ; les sources directes, l'émission et le mode Unlit ne sont pas modifiés.
- Aucun nouveau paramètre de projet ou fichier d'asset n'est introduit ; le même shader est utilisé par Scene, Game et l'export Web.

## Contrôles

Le fichier `tests/pbr-browser-fixture.mjs` teste directement les pixels du **shader WebGL de production** dans Chromium : différence lisse/rugueux avec seulement la lumière ambiante, préservation du diffuse diélectrique, plus les précédentes vérifications GGX et Unlit. Le test est lancé par `scripts/test-3d-pbr-browser.mjs`.

## Limites

C'est une **approximation hémisphérique**, pas une vraie réflexion IBL : aucune cubemap HDR, importance sampling, préfiltrage de mipmaps ou sonde de réflexion n'est ajouté. Les ombres portées et Screen-Space Ambient Occlusion restent des chantiers distincts. La fidélité artistique des GLB doit également être examinée visuellement sur de vraies scènes et dans l'export autonome.
