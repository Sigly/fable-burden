import "./burden.mjs";
import { MODULE_ID } from "./burden-core.mjs";
import { renderTraceHtml, activateTrace } from "./tab.mjs";
import { syncActor, addToActor } from "./build.mjs";
import { onRestCompleted, idolize, endIdolization, lastStand, setRenown, getRenown, getMegin } from "./idolize.mjs";
import {
  openLibrary, openAddDialog, buildCompendium, createMacros, linkNewItem, addKit, addCategory, addByName, catalog, loadFables
} from "./library.mjs";

/** GMs always see Trace. Players see it on a character only when the GM has revealed it (or the setting is off). */
export const traceVisible = actor => game.user.isGM || !game.settings.get(MODULE_ID, "gmOnly")
  || !!actor?.getFlag(MODULE_ID, "traceShown");
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
    hint: "Only GMs see the Trace tab, its abilities, the library button, the Trace 5.5e compendium and the Trace macros. On each character the GM can reveal the Trace tab and its abilities with the Show to player button.",
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
  // Trace abilities live only in the Trace tab, so they are taken out of the normal lists.
  // Fables stay in the inventory (to equip them) unless Trace is hidden on this character.
  const visible = traceVisible(actor);
  for ( const row of element.querySelectorAll("[data-item-id]") ) {
    if ( row.closest(".trace-tab") ) continue;
    const item = actor.items.get(row.dataset.itemId);
    const key = item?.getFlag(MODULE_ID, "key");
    if ( !key ) continue;
    if ( (item.getFlag(MODULE_ID, "category") !== "fable") || !visible ) row.remove();
  }
});

Hooks.on("dnd5e.restCompleted", onRestCompleted);

// Keep pools and DCs correct when levels change or Trace items are dropped on a sheet.
Hooks.on("createItem", (item, options, userId) => {
  if ( userId !== game.user.id ) return;
  if ( item.parent?.documentName === "Actor" && item.getFlag(MODULE_ID, "key") && !options.traceInternal ) linkNewItem(item);
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
    openLibrary, openAddDialog, addToActor, addKit, addCategory, addByName, syncActor, catalog, loadFables,
    idolize, endIdolization, lastStand, setRenown, getRenown, getMegin
  };
  if ( game.user.isGM ) {
    try {
      if ( game.settings.get(MODULE_ID, "autoBuild") ) await buildCompendium();
      if ( game.settings.get(MODULE_ID, "autoMacros") ) await createMacros();
    } catch(err) { console.error("Trace 5.5e | setup failed", err); }
  }
});
