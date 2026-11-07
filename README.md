# Trace 5.5e

Everything for the Trace campaign in one Foundry VTT module for D&D 5e (dnd5e 5.2+, Foundry v13+).

## What is inside
- **Fable Burden.** Attunement is replaced by Burden (capacity = proficiency bonus + 1), with the Fable rarity ladder. If the separate Fable Burden module is active, Trace 5.5e steps aside and warns you.
- **Megin, Regin (passive), Þrek, Seiðr.** Feature items, 55 Þrek Arts (The Play, Enhance x6, Willful x2, and the weapon styles Spear [Hoplite Form], Great Axe, Sword, Bow, Shield, Hammer and Thrown Weapon [Bouncing Beetle Style]) with dice, DCs and consumption wired up. The library shows each Art's style, and the Seiðr spell list with point costs.
- **100 Fables** with Blueprint, Maxim and Burden. Each is an equipment item with its Burden flag set.
- **Idolization.** Renown (0 to 100), Megin rating, Epithet, and the three forms Maxim, Partial Idolization and Ascension, plus Last Stand and the 3 levels of exhaustion afterwards.
- **Níð and Æði.** Rati, Orkan Rati, Orkan Puris, Klofna, Staðna, Spjölling, Haugr, Getnaðr and the party ability Leiftr (drafts).

## How to use it
- Every character and NPC sheet gets a **Trace** tab that holds all the abilities: Megin and Regin, Þrek (dice and Arts), Seiðr (points and spells), Idolization, Níð and Fables. Each ability row can be used, expanded to read it, opened or removed. Trace abilities are taken out of the normal Features and Spells lists, so they live only in this tab (Fables stay in the inventory so they can be equipped).
- **Dropdown:** the Trace tab's "Add to this character" button, the Items directory "Trace 5.5e" button, or the macro "Trace: Add to character".
- **Drag and drop:** a world compendium named Trace 5.5e is built for you (GM, on first load). Drag any entry onto a sheet. Trace links Þrek Arts to the Þrek Dice pool automatically.
- **Macros:** a "Trace 5.5e" macro folder is created with the Library, Add, Trace kit, Add every Art, and Add a Fable macros.
- The **Trace Library** window lists everything by section with search, drag handles and + buttons.
- Console API: `game.modules.get("trace-5e").api`.

## Visibility
By default Trace is GM only: the Trace tab, its abilities, the library button, compendium and macros are hidden from players (setting "Hide Trace from players"). On each character the GM reveals Trace one section at a time (Burden, Renown and Megin, Megin and Regin, Þrek, Seiðr, Idolization, Fables, Níð and Æði) with the "Show to player" button in that section header. The tab appears for the player once any section is shown, and only shown sections and their abilities are visible. Each section can be hidden again.

## Notes
- Þrek Dice and Seiðr Points are feature items whose uses recalculate from character level. Use the Recalculate button after a level change if a number looks stale.
- Seiðr spells: drag any spell onto the Seiðr box on the Trace tab (from the compendium, the Items sidebar or another sheet) and it becomes a Seiðr spell paid for with Seiðr Points. The add dropdown and library also work. Upcasting is not automated.
- Níð powers and the Idolization active/passive choices are free text and drafts. Adjust to your table.
