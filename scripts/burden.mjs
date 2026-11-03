import {
  MODULE_ID, DEFAULT_RARITY_BURDEN, parseRarityTable, itemBurden, usedBurden, capacityFor, wouldExceed
} from "./burden-core.mjs";

const ITEM_TYPES_WITH_BURDEN = new Set(["weapon", "equipment", "consumable", "tool", "container", "loot", "feat"]);
const EQUIPPABLE_MODELS = ["EquipmentData", "WeaponData", "ToolData", "ContainerData", "ConsumableData"];

const localize = (key, data) => data ? game.i18n.format(key, data) : game.i18n.localize(key);
const getSetting = key => game.settings.get(MODULE_ID, key);

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

const standaloneActive = () => !!game.modules.get("fable-burden")?.active;

Hooks.once("init", () => {
  if ( standaloneActive() ) return;
  const S = "FABLE_BURDEN.Settings";

  game.settings.register(MODULE_ID, "enforcement", {
    name: `${S}.Enforcement.Name`,
    hint: `${S}.Enforcement.Hint`,
    scope: "world",
    config: true,
    type: String,
    default: "warn",
    choices: {
      off: `${S}.Enforcement.Off`,
      warn: `${S}.Enforcement.Warn`,
      block: `${S}.Enforcement.Block`
    }
  });

  game.settings.register(MODULE_ID, "capacityBonus", {
    name: `${S}.CapacityBonus.Name`,
    hint: `${S}.CapacityBonus.Hint`,
    scope: "world",
    config: true,
    type: Number,
    default: 1
  });

  game.settings.register(MODULE_ID, "rarityTable", {
    name: `${S}.RarityTable.Name`,
    hint: `${S}.RarityTable.Hint`,
    scope: "world",
    config: true,
    type: String,
    default: JSON.stringify(DEFAULT_RARITY_BURDEN)
  });

  game.settings.register(MODULE_ID, "optionalCounts", {
    name: `${S}.OptionalCounts.Name`,
    hint: `${S}.OptionalCounts.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "removeAttunement", {
    name: `${S}.RemoveAttunement.Name`,
    hint: `${S}.RemoveAttunement.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register(MODULE_ID, "fableRarities", {
    name: `${S}.FableRarities.Name`,
    hint: `${S}.FableRarities.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
});

/* -------------------------------------------- */
/*  Setup: rarity ladder and attunement removal */
/* -------------------------------------------- */

Hooks.once("setup", () => {
  if ( game.system.id !== "dnd5e" ) return;
  if ( standaloneActive() ) return;
  if ( getSetting("fableRarities") ) applyFableRarities();
  if ( getSetting("removeAttunement") ) removeAttunement();
});

Hooks.once("ready", () => {
  if ( game.system.id !== "dnd5e" ) return;
  if ( !standaloneActive() && getSetting("removeAttunement") ) document.body.classList.add("fable-burden-no-attunement");
  if ( standaloneActive() ) ui.notifications.warn("Trace 5.5e includes Fable Burden. Disable the separate Fable Burden module to avoid double handling.");
});

/**
 * Rebuild the rarity list as Common, Uncommon, Rare, Epic, Unique, Legendary, Mythical, Artifact.
 * The dnd5e key "veryRare" is kept (so existing items still work) but is shown as Epic.
 */
function applyFableRarities() {
  const old = CONFIG.DND5E.itemRarity;
  CONFIG.DND5E.itemRarity = {
    common: old.common,
    uncommon: old.uncommon,
    rare: old.rare,
    veryRare: localize("FABLE_BURDEN.Rarity.Epic"),
    unique: localize("FABLE_BURDEN.Rarity.Unique"),
    legendary: old.legendary,
    mythical: localize("FABLE_BURDEN.Rarity.Mythical"),
    artifact: old.artifact
  };
}

/**
 * Make items that need attunement work whenever they are equipped.
 */
function removeAttunement() {
  // Effects are only suppressed by the equipped state, never by attunement.
  const itemProto = CONFIG.Item.documentClass.prototype;
  Object.defineProperty(itemProto, "areEffectsSuppressed", {
    configurable: true,
    get() {
      const requireEquipped = (this.type !== "consumable")
        || ["rod", "trinket", "wand"].includes(this.system.type?.value);
      return requireEquipped && (this.system.equipped === false);
    }
  });

  // Anything that can be attuned is treated as attuned, so activities and effects are never hidden by it.
  for ( const name of EQUIPPABLE_MODELS ) {
    const Model = globalThis.dnd5e?.dataModels?.item?.[name];
    const original = Model?.prototype?.prepareFinalEquippableData;
    if ( (typeof original !== "function") || original.__fableBurden ) continue;
    const patched = function(...args) {
      const result = original.apply(this, args);
      if ( this.canAttune ) this.attuned = true;
      return result;
    };
    patched.__fableBurden = true;
    Model.prototype.prepareFinalEquippableData = patched;
  }

  // The attune button and context menu entry do nothing.
  const Inventory = globalThis.dnd5e?.applications?.components?.InventoryElement
    ?? globalThis.customElements?.get("dnd5e-inventory");
  if ( Inventory?.prototype ) {
    Inventory.prototype._onToggleAttunement = function() {
      ui.notifications.info(localize("FABLE_BURDEN.AttunementDisabled"));
    };
  }
}

/* -------------------------------------------- */
/*  Burden helpers                              */
/* -------------------------------------------- */

export function currentOptions() {
  return {
    table: parseRarityTable(getSetting("rarityTable")),
    optionalCounts: getSetting("optionalCounts"),
    bonus: Number(getSetting("capacityBonus"))
  };
}

/**
 * Burden summary for an actor.
 * @param {Actor} actor
 * @returns {{used: number, capacity: number, entries: {id: string, name: string, burden: number}[]}}
 */
export function actorBurden(actor) {
  const { table, optionalCounts, bonus } = currentOptions();
  const { used, entries } = usedBurden(actor.items, table, { optionalCounts });
  return { used, entries, capacity: capacityFor(actor, bonus) };
}

/**
 * Burden cost of one item.
 * @param {Item} item
 * @returns {number}
 */
function burdenOf(item) {
  const { table, optionalCounts } = currentOptions();
  return itemBurden(item, table, { optionalCounts });
}

export const burdenApi = { actorBurden, burdenOf, capacityFor, itemBurden, usedBurden, parseRarityTable, DEFAULT_RARITY_BURDEN };

/* -------------------------------------------- */
/*  Enforcement                                 */
/* -------------------------------------------- */

Hooks.on("preUpdateItem", (item, changes, options, userId) => {
  if ( game.system.id !== "dnd5e" || standaloneActive() ) return;
  if ( userId !== game.user.id ) return;
  const mode = getSetting("enforcement");
  if ( mode === "off" ) return;

  const actor = item.parent;
  if ( actor?.documentName !== "Actor" ) return;
  if ( foundry.utils.getProperty(changes, "system.equipped") !== true ) return;
  if ( item.system.equipped === true ) return;
  if ( item.system.container ) return;

  const burden = burdenOf(item);
  if ( !burden ) return;

  const { used, capacity } = actorBurden(actor);
  if ( !wouldExceed(used, burden, capacity) ) return;

  if ( (mode === "block") && !game.user.isGM ) {
    ui.notifications.error(localize("FABLE_BURDEN.OverCapacityBlock", {
      actor: actor.name, item: item.name, burden, free: Math.max(0, capacity - used)
    }));
    return false;
  }
  ui.notifications.warn(localize("FABLE_BURDEN.OverCapacityWarn", {
    actor: actor.name, item: item.name, used: used + burden, capacity
  }));
});

/* -------------------------------------------- */
/*  Sheets                                      */
/* -------------------------------------------- */

Hooks.on("renderApplicationV2", (app, element) => {
  if ( game.system.id !== "dnd5e" || standaloneActive() ) return;
  const doc = app.document;
  if ( doc?.documentName === "Actor" ) renderTracker(app, element, doc);
  else if ( doc?.documentName === "Item" ) renderItemField(app, element, doc);
});

/**
 * Replace the attunement tracker on the inventory tab with a Burden tracker.
 * It reuses the attunement tracker's markup so it keeps the same look.
 */
function renderTracker(app, element, actor) {
  if ( !["character", "npc"].includes(actor.type) ) return;
  const host = element.querySelector('[data-application-part="inventory"] .middle');
  if ( !host ) return;
  host.querySelectorAll(".fable-burden").forEach(el => el.remove());

  const { used, capacity, entries } = actorBurden(actor);
  const tracker = document.createElement("div");
  tracker.classList.add("attunement", "fable-burden");
  if ( used > capacity ) tracker.classList.add("over");
  const list = entries.length ? entries.map(e => `${e.name} (${e.burden})`).join(", ")
    : localize("FABLE_BURDEN.NothingCarried");
  tracker.dataset.tooltip = `${localize("FABLE_BURDEN.Carrying")}: ${list}`;
  tracker.innerHTML = `
    <i class="fa-solid fa-weight-hanging"></i>
    <span class="value"></span>
    <span class="separator">&sol;</span>
  `;
  tracker.querySelector("i").setAttribute("aria-label", localize("FABLE_BURDEN.Burden"));
  tracker.querySelector(".value").append(String(used));

  if ( app.isEditable ) {
    const input = document.createElement("input");
    Object.assign(input, { type: "number", className: "max", min: "0", step: "1", value: String(capacity) });
    input.dataset.tooltip = localize("FABLE_BURDEN.Capacity");
    input.addEventListener("change", async event => {
      event.stopPropagation();
      const raw = event.currentTarget.value;
      const standard = capacityFor({ system: actor.system }, currentOptions().bonus);
      const value = Math.max(0, Math.floor(Number(raw)));
      if ( (raw === "") || !Number.isFinite(value) || (value === standard) ) await actor.unsetFlag(MODULE_ID, "capacity");
      else await actor.setFlag(MODULE_ID, "capacity", value);
    });
    tracker.append(input);
  } else {
    const span = document.createElement("span");
    span.classList.add("max");
    span.append(String(capacity));
    tracker.append(span);
  }

  const original = host.querySelector(".attunement:not(.fable-burden)");
  if ( original ) original.replaceWith(tracker);
  else host.append(tracker);
}

/**
 * Add a Burden field to the details tab of item sheets.
 */
function renderItemField(app, element, item) {
  if ( !ITEM_TYPES_WITH_BURDEN.has(item.type) ) return;
  const part = element.querySelector('[data-application-part="details"]');
  if ( !part ) return;
  part.querySelectorAll(".fable-burden-field").forEach(el => el.remove());

  const { table, optionalCounts } = currentOptions();
  const fallback = itemBurden({ system: item.system }, table, { optionalCounts });
  const current = item.getFlag(MODULE_ID, "burden");
  const fieldset = document.createElement("fieldset");
  fieldset.classList.add("fable-burden-field");
  fieldset.innerHTML = `
    <legend></legend>
    <div class="form-group">
      <label></label>
      <div class="form-fields"><input type="number" min="0" step="1"></div>
      <p class="hint"></p>
    </div>
  `;
  fieldset.querySelector("legend").textContent = localize("FABLE_BURDEN.Burden");
  fieldset.querySelector("label").textContent = localize("FABLE_BURDEN.Burden");
  fieldset.querySelector(".hint").textContent = localize("FABLE_BURDEN.BurdenHint");
  const input = fieldset.querySelector("input");
  input.name = `flags.${MODULE_ID}.burden`;
  input.disabled = !app.isEditable;
  input.placeholder = localize("FABLE_BURDEN.BurdenDefault", { value: fallback });
  const hasValue = (current !== null) && (current !== undefined) && (current !== "") && Number.isFinite(Number(current));
  input.value = hasValue ? String(Number(current)) : "";
  part.prepend(fieldset);
}
