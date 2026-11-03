# Fable Burden

Removes attunement from D&D 5e and replaces it with Burden. For Foundry v13 and v14 with the dnd5e system 5.2 or newer (written against 5.3.3).

## Install

Unzip the `fable-burden` folder into `Data/modules/` (so you end up with `Data/modules/fable-burden/module.json`), restart Foundry, and enable it in your world under Manage Modules. Two settings need a reload after you change them.

## What it does

**Attunement is gone.**
- Items that needed attunement work whenever they are equipped. Their effects and activities are no longer hidden for being unattuned.
- The attune button on inventory rows is hidden, and the attunement tracker on the inventory tab is replaced by the Burden tracker. The attune entry in the right-click menu does nothing.
- Nothing is deleted. The attunement field on items is left alone, because it now means "this item costs Burden".

**Burden is added.**
- Each character can carry **proficiency bonus + 1** Burden (3 at level 1, 7 at level 17). Change the bonus in settings, or type a different number into the tracker to override one character.
- An item costs Burden while it is equipped. Items inside a container never count.
- Items that used to require attunement cost Burden by rarity: Common 1, Uncommon 2, Rare 3, Epic 4, Unique 4, Legendary 5, Mythical 6, Artifact 7. Edit the numbers in the "Burden by rarity" setting.
- Any item can carry its own Burden. Open the item, go to its Details tab, and fill in the Burden field. A number there always wins, including 0. Leave it blank to use the rarity default.
- Items with optional attunement are free unless you turn on "Optional attunement costs Burden".
- Feats and other items that cannot be equipped count whenever they have a Burden number typed in. That is how a Fable stored as a feature can cost Burden.

**Burden limit.** When someone equips an item that would put them over capacity, the setting decides: do nothing, warn, or block players. GMs only ever get a warning. The tracker turns red when a character is over.

**Fable rarity ladder.** Turn on "Use the Fable rarity ladder" to get Common, Uncommon, Rare, Epic, Unique, Legendary, Mythical, Artifact in the rarity dropdown. Epic is the existing Very Rare (the key is unchanged, so old items still work). Unique and Mythical are new.

## For macros

`game.modules.get("fable-burden").api` has:
- `actorBurden(actor)` returns `{ used, capacity, entries }`.
- `burdenOf(item)` returns the Burden cost of one item.

## Not tested live

The Burden rules, settings, tracker and item field were run against a mocked Foundry, but this has not been run inside a live Foundry world. If a sheet looks off or the Burden field on an item will not save, that is the first place to look.
