# WarLike Engine V0.5 — Content Pack (2026-10-24)

54 built-in, original, procedural SVG asset definitions, embedded in `js/assets/catalog.js`; **no CDN or asset download is necessary**.

| Category | Count | Included |
|---|---:|---|
| Characters | 6 | Scout, Soldier, Medic, Sniper, Mechanic, Survivor |
| Monsters | 6 | Zombie, Slime, Skeleton, Goblin, Hostile Robot, Demon |
| Vehicles | 5 | Jeep, Buggy, Tank, Motorbike, APC |
| Weapons | 12 | Pistol, Assault Rifle, Sniper Rifle, Shotgun, SMG, Rocket Launcher, Sword, Axe, Bow, Magic Staff, Grenade, Mine |
| Props | 25 | Crate, Barrel, Explosive Barrel, Treasure Chest, Door, Lamp, Terminal, Bed, Table, Chair, Rock, Tree, Bush, Fence, Sign, Bridge, Stairs, Campfire, Sandbags, Wall, Window, Computer, Generator, Medkit, Ammo Box |

## Using the pack
- Search, filter and click an asset card to create a prefab in your scene.
- Change name, position, dimensions, color, animation mode, behavior, and HP in Inspector.
- Undo/redo prefab insertion and edits.
- Prefabs are retained in the JSON scene, browser autosave, and configured Cloudflare KV cloud saving.
- In Game mode, monster prefabs with a **Patrol** or **Chase** behavior move. Select a monster and change its Behavior to test.
- Built-in human-character SVG frame animations remain in `assets/characters/`.

## Scope and limitations
This is a **starter content library**. Each procedural category illustration is a distinguishable original SVG variant, but it is *not* a professional hand-authored spritesheet or a full set of animation clips per asset. Vehicle driving, weapon combat/reload, inventory, sound, TileMaps, enemy health/damage and advanced animation controllers are not yet built. Property `animation` on generic prefabs is stored but does not provide individual sprite animation clips. Scene and editor continue to run with the native Canvas prototype; only one utility source is currently copied from Phaser.

Browser autosave is local to the browser. Cross-device saving requires Cloudflare KV binding and a secret as explained in `CLOUD-SETUP.md`; it is not automatically enabled by this release.
