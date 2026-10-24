# WarLike Studio V1.5 — Ninja / Zombie Animation Library

All code and drawings are original, offline and included directly in WarLike Engine. No Unity packages or external downloaded assets are required for the browser editor.

## New models
- Characters: Shadow Ninja (`ninja`), Elite Ninja (`ninja-elite`)
- Monsters: Runner Zombie (`zombie-runner`), Crawler Zombie (`zombie-crawler`), Brute Zombie (`zombie-brute`)
- Existing basic `zombie` also uses the improved articulated zombie renderer in the Scene.
- 110 existing assets + 5 new prefabs = **115 total**.

## Animations
- **Shared humanoid:** idle, walk, run, sprint, turns, crouch, jumps, fall, two attacks, heavy attack, air attack, block, parry, hurt, stagger, death, interaction, pickup, use item, climb, roll, dash, victory, etc.
- **Ninja:** stealth idle/walk, triple katana attacks, dash slash, shuriken throw, wall run/jump, backflip, evade, silent takedown, hide, peek, meditate.
- **Zombies:** idle/walk/run, lunge, bite, claw attacks, grab, hit/stagger, knockdown, get up, crawl/crawl attack, scream, mutant smash, berserk run.
- The Inspector lists applicable animation names and offers Playback Speed and Preview in Scene.

## How to test
1. Open the Studio and save your current scene first if needed.
2. Game → **Ninja vs Zombies** (loading a demo replaces the editor scene; Ctrl+Z can undo).
3. Press Play. Use ZQSD to move the ninja, **K** to swing the katana near monsters, **F** or mouse click for ranged attacks.
4. Select an asset before Play, then choose its Animation clip in the Inspector, enable Preview to see it in Scene.
5. New zombies demonstrate different attack/locomotion motion; Runner is faster and Brute has more HP.

## Implementation and limitations
- Animation logic: `js/assets/humanoid-rigs.js` and `js/assets/animation-vfx.js`, in the Canvas renderer.
- This is **procedural articulated 2D animation**, not separate hand-animated sprite sheets, 3D skeletal animation, or motion-captured clips. Several named actions share generic pose curves; they are selectable and previewable but do not all have unique production-quality keyframes or gameplay interactions.
- The katana attack has a simple close-range damage check, without hitbox timeline, combos or stamina. Existing ranged shooting is still available.
- Ninja and zombie art previews use vector illustration. Existing saved scenes and asset IDs remain compatible.
