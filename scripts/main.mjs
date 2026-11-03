import "./burden.mjs";
import { MODULE_ID } from "./burden-core.mjs";
import { renderTraceHtml, activateTrace } from "./tab.mjs";
import { syncActor, addToActor } from "./build.mjs";
import { onRestCompleted, idolize, endIdolization, lastStand, setRenown, getRenown, getMegin } from "./idolize.mjs";
import {
  openLibrary, openAddDialog, buildCompendium, createMacros, linkNewItem, addKit, addCategory, addByName, catalog, loadFables
} from "./library.mjs";

const TAB = { tab: "trace", label: "Trace", icon: "fa-solid fa-eye" };
const PART = {
  container: { classes: ["tab-body"], id: "tabs" },
  template: `modules/${MODULE_ID}/templates/trace-tab.hbs`,
  scrollable: [""]
};

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "libraryVersion", { scope: "world", config: false, type: String, default: "" });
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
  if ( partId !== "trace" ) return;
  context.traceHtml = renderTraceHtml(sheet.document);
});

Hooks.on("renderApplicationV2", (app, element) => {
  if ( game.system.id !== "dnd5e" ) return;
  if ( app.document?.documentName === "Actor" ) activateTrace(app, element, app.document);
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
  if ( element.querySelector(".trace-open") ) return;
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
