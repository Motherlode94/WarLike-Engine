# WarLike Studio V1.2 — Visual Logic (Game Creator 2–inspired)

Original code. This is **not** a copy of Game Creator 2 or its proprietary Unity package. The initial no-code workflow takes inspiration from its Trigger / Conditions / Instructions separation.

## Getting started
1. Save your current scene first, then click **⚡ Logic Demo** (this replaces the scene in the editor and remains undoable).
2. Click **▶ Play**.
3. Walk with ZQSD to the treasure chest. Press **E** within its interaction radius.
4. The first hotspot grants an inventory key and displays a message.
5. Walk to the door and press **E**. The door checks **Has Item: key >= 1** before displaying its success message and disappearing.
6. Click Stop to restore the original authored scene.

## Build your own visual logic
Use **Assets → Créer Hotspot interactif**, or select any existing object and choose **+ Add Visual Logic** in the Inspector. Choose a Trigger, an optional list of Conditions, and an ordered list of Actions. Values and configuration are part of the scene JSON; browser auto-save preserves them.

| Events | Conditions | Instructions |
|---|---|---|
| onStart | always | message |
| onInteract (E nearby) | variableEquals | setVariable |
| onEnter | variableAtLeast | addVariable |
| onExit | hasItem | heal / damage |
| onUpdate | healthBelow | teleport / destroy / changeColor / giveItem |

- Interaction radius is editable.
- A trigger can run once.
- Local variable placeholders exist on the component; global state and inventory are evaluated at runtime.
- Instructions run in order.
- The basic inventory currently stores item identifiers and counts; there is no inventory grid UI, equipment, crafting or persistent quest journal.
- No advanced branching editor, nested flow graphs or async tween instructions yet.
- Game Creator 2 is a separate commercial Unity product.

## Source code
- `js/core/visual-logic.js`: self-contained event + condition + actions engine
- `js/ui/inspector.js`: no-code authoring interface
- `js/core/scene.js`: creation and JSON import compatibility
- `js/core/gameplay.js`: integrates logic into Play mode

## Notes
Play / Stop still restores authored objects and clears runtime variables. Cloud saving between devices still requires configured Cloudflare KV, separate from visual logic.
