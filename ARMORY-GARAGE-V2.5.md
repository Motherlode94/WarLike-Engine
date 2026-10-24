# WarLike Studio V2.5 — Armory & Garage

48 new original offline 2D SVG prefabs, comprising **24 weapons** and **24 vehicles**, merged into the existing Project / Assets browser. Catalogue total: **295** (247 before + 48).

## Armory (24)
Burst rifle, marksman rifle, heavy machine gun, compact SMG, tactical shotgun, double barrel, revolver, machine pistol, energy carbine, plasma cannon, heavy crossbow, longbow, war spear, greatsword, dual daggers, battle axe, warhammer, magic scepter, ice wand, fire staff, railgun, grenade launcher, anti-armor launcher, laser pistol.

For new weapons, Inspector → Weapon Configuration controls damage, seconds between attacks, and projectile range. In Play approach a placed weapon and press **G** to equip it; fire with **left click** or **F**. Weapons currently use simplified 2D projectile-style combat; they do **not** yet have unique reload animations, actual shotgun pellet spread, physics explosions, or weapon-in-hand rigging. Melee attacks also use the existing simplified short-range attack representation.

## Garage (24)
Offroad SUV, armored SUV, city hatchback, delivery van, heavy truck, fuel tanker, police SUV, SWAT van, rescue ambulance, rally car, formula racer, dune buggy, sport motorcycle, cruiser motorcycle, armored carrier, scout tank, heavy tank, rocket truck, command truck, rescue boat, patrol boat, hover bike, hover tank, cargo forklift.

The new vehicles inherit the existing 2D driving controller. Their preset acceleration, max speed, brakes, turn rate, collision radius and HP are customizable in Inspector. Approaching a vehicle and pressing **E** begins the existing enter/drive/exit interaction. Boat, aircraft-like or hovering appearances **do not imply full water, flight or hover physics**.

## Compatibility and validation
- Exported scene JSON preserves new weapon stats and existing vehicle fields; imported scenes with known IDs retain the associated presets.
- All 48 assets use self-contained original SVG imagery; no network or third-party assets.
- New `tests/armory-garage.test.mjs` checks catalogue count, IDs, stats, and SVG generation.
- JavaScript syntax checks passed on touched files, but tests have **not been executed** within a Node/browser runtime here, and Cloudflare deployment was not confirmed.
