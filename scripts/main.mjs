import "./burden.mjs";
import { MODULE_ID } from "./burden-core.mjs";
import { sectionOf, sectionShown, anySectionShown } from "./reveal.mjs";
import { renderTraceHtml, activateTrace } from "./tab.mjs";
import { syncActor, addToActor, addDroppedSpell } from "./build.mjs";
import { onRestCompleted, idolize, endIdolization, lastStand, setRenown, getRenown, getMegin } from "./idolize.mjs";
import {
  openLibrary, openAddDialog, buildCompendium, createMacros, linkNewItem, addKit, addCategory, addByName, catalog, loadFables
} from "./library.mjs";
import { openSeidrForge, seidrNameFor } from "./forge.mjs";

/** GMs always see Trace. Players see the tab on a character once the GM has revealed at least one section (or the setting is off). */
export const traceVisible = actor => (actor ? anySectionShown(actor) : (game.user.isGM || !game.settings.get(MODULE_ID, "gmOnly")));
const TAB = { tab: "trace", label: "Trace", icon: "fa-solid fa-eye", condition: actor => traceVisible(actor) };
const PART = {
  container: { classes: ["tab-body"], id: "tabs" },
  template: `modules/${MODULE_ID}/templates/trace-tab.hbs`,
  scrollable: [""]
};

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "libraryVersion", { scope: "world", config: false, type: String, default: "" });
  game.settings.register(MODULE_ID, "gmOnly", {
    name: "Hide Trace from players",
    hint: "Only GMs see the Trace tab, its abilities, the library button, the Trace 5.5e compendium and the Trace macros. On each character the GM reveals the Trace sections one at a time with the eye button on each section.",
    scope: "world", config: true, type: Boolean, default: true, requiresReload: true
  });
  game.settings.register(MODULE_ID, "autoBuild", {
    name: "Build the Trace compendium automatically",
    hint: "GMs only. Creates and refreshes the world compendium Trace 5.5e so items can be dragged onto sheets.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, "autoMacros", {
    name: "Create the Trace macros automatically",
    hint: "GMs only. Creates a Trace 5.5e macro folder with the add and library macros.",
    scope: "world", config: true, type: Boolean, default: true
  });
  foundry.applications.handlebars.loadTemplates([`modules/${MODULE_ID}/templates/trace-tab.hbs`]);
});

Hooks.once("setup", () => {
  if ( game.system.id !== "dnd5e" ) return;
  const sheets = dnd5e.applications.actor;
  for ( const Sheet of [sheets.CharacterActorSheet, sheets.NPCActorSheet] ) {
    if ( !Sheet || Sheet.TABS.some(t => t.tab === TAB.tab) ) continue;
    Sheet.TABS.push({ ...TAB });
    Sheet.PARTS.trace = { ...PART };
  }
});

Hooks.on("dnd5e.prepareSheetContext", (sheet, partId, context) => {
  if ( partId !== "trace" || !context.tab || !traceVisible(sheet.document) ) return;
  context.traceHtml = renderTraceHtml(sheet.document);
});

Hooks.on("renderApplicationV2", (app, element) => {
  if ( game.system.id !== "dnd5e" ) return;
  const actor = app.document;
  if ( actor?.documentName !== "Actor" ) return;
  activateTrace(app, element, actor);
  // Self-heal: if a Trace activity points at a pool that no longer exists, relink it.
  if ( actor.isOwner && !app._traceHealing && actor.items.some(i => i.getFlag(MODULE_ID, "key")
    && Array.from(i.system.activities ?? []).some(a => (a.consumption?.targets ?? []).some(t => t.type === "itemUses" && t.target && !t.target.includes(".") && !actor.items.get(t.target)))) ) {
    app._traceHealing = true;
    syncActor(actor).finally(() => { app._traceHealing = false; });
  }
  // Trace abilities live only in the Trace tab, so they are taken out of the normal lists.
  // Fables stay in the inventory (to equip them) unless Trace is hidden on this character.
  for ( const row of element.querySelectorAll("[data-item-id]") ) {
    if ( row.closest(".trace-tab") ) continue;
    const item = actor.items.get(row.dataset.itemId);
    const key = item?.getFlag(MODULE_ID, "key");
    if ( !key ) continue;
    const section = sectionOf(item);
    if ( (section !== "fables") || !sectionShown(actor, "fables") ) row.remove();
  }
});

Hooks.on("dnd5e.restCompleted", onRestCompleted);

// Keep pools and DCs correct when levels change or Trace items are dropped on a sheet.
Hooks.on("createItem", (item, options, userId) => {
  if ( userId !== game.user.id ) return;
  if ( item.parent?.documentName === "Actor" && item.getFlag(MODULE_ID, "key") && !options.traceInternal ) linkNewItem(item);
});
// If a pool is deleted, repoint or clear the activities that pointed at it so no "could not be found" warnings appear.
Hooks.on("deleteItem", (item, options, userId) => {
  if ( userId !== game.user.id ) return;
  const key = item.getFlag(MODULE_ID, "key");
  if ( item.parent?.documentName === "Actor" && ["threk-dice", "seidr-points"].includes(key) ) syncActor(item.parent);
});
Hooks.on("updateItem", (item, changes, options, userId) => {
  if ( userId !== game.user.id ) return;
  if ( item.type === "class" && foundry.utils.hasProperty(changes, "system.levels") && item.parent ) syncActor(item.parent);
});

// Add a Trace button to the Items directory.
Hooks.on("renderItemDirectory", (app, element) => {
  if ( element.querySelector(".trace-open") || !traceVisible() ) return;
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("trace-open");
  button.innerHTML = `<i class="fa-solid fa-eye"></i> Trace 5.5e`;
  button.addEventListener("click", () => openLibrary());
  (element.querySelector(".header-actions") ?? element.querySelector("header"))?.append(button);
});

Hooks.once("ready", async () => {
  if ( game.system.id !== "dnd5e" ) return;
  game.modules.get(MODULE_ID).api = {
    openLibrary, openAddDialog, addToActor, addDroppedSpell, addKit, addCategory, addByName, syncActor, catalog, loadFables,
    idolize, endIdolization, lastStand, setRenown, getRenown, getMegin, openSeidrForge, seidrNameFor
  };
  if ( game.user.isGM ) {
    try {
      if ( game.settings.get(MODULE_ID, "autoBuild") ) await buildCompendium();
      if ( game.settings.get(MODULE_ID, "autoMacros") ) await createMacros();
    } catch(err) { console.error("Trace 5.5e | setup failed", err); }
  }
});
