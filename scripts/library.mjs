/** The Trace Library: catalog, world compendium, add dialog, library window, macros. */
import { MODULE_ID as FLAG } from "./burden-core.mjs";
import { POWERS, CATEGORIES, CORE_KEYS } from "./data/powers.mjs";
import { addToActor, buildPower, buildFable, seidrSpellList } from "./build.mjs";

const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");
const PACK_NAME = "trace-5e";
let FABLES = null;

export async function loadFables() {
  if ( FABLES ) return FABLES;
  const res = await fetch(`modules/${FLAG}/scripts/data/fables.json`);
  FABLES = await res.json();
  return FABLES;
}

/** All catalog entries: { key, category, name, sub }. */
export async function catalog() {
  const fables = await loadFables();
  const entries = POWERS.map(p => ({ key: p.key, category: p.category, name: p.name, sub: "" }));
  for ( const s of seidrSpellList() ) {
    entries.push({ key: `seidr-spell:${s.name}:${s.level}`, category: "seidr", name: s.name, sub: s.level ? `Level ${s.level}` : "Cantrip" });
  }
  for ( const f of fables ) entries.push({ key: `fable-${f.num}`, category: "fable", name: f.name, sub: f.tier, clan: f.clan, holder: f.holder });
  entries.push({ key: "__burden__", category: "burden", name: "Fable Burden is built in", sub: "Shows on the inventory and the Trace tab" });
  return entries;
}

const categoryLabel = id => CATEGORIES.find(c => c.id === id)?.label ?? id;

/* ---------------- World compendium (drag and drop source) ---------------- */

export const packId = () => `world.${PACK_NAME}`;

export async function buildCompendium({ force = false } = {}) {
  if ( !game.user.isGM ) return null;
  const version = game.modules.get(FLAG).version;
  let pack = game.packs.get(packId());
  if ( pack && !force && game.settings.get(FLAG, "libraryVersion") === version ) return pack;
  if ( !pack ) {
    pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      label: "Trace 5.5e", name: PACK_NAME, type: "Item", packageType: "world"
    });
  }
  const existing = await pack.getDocuments();
  if ( existing.length ) await Item.deleteDocuments(existing.map(d => d.id), { pack: pack.collection });
  const fables = await loadFables();
  const data = [...POWERS.map(buildPower), ...fables.map(buildFable)];
  // Folders keep the compendium browsable.
  await Item.createDocuments(data, { pack: pack.collection });
  await game.settings.set(FLAG, "libraryVersion", version);
  ui.notifications.info("Trace 5.5e compendium built. Drag items from it onto any character sheet.");
  return pack;
}

async function uuidIndex() {
  const pack = game.packs.get(packId());
  if ( !pack ) return {};
  const index = await pack.getIndex({ fields: [`flags.${FLAG}.key`] });
  const map = {};
  for ( const e of index ) { const k = e.flags?.[FLAG]?.key; if ( k ) map[k] = e.uuid; }
  return map;
}

/** When a Trace item is dropped or created on an actor by hand, wire it up. */
export async function linkNewItem(item) {
  const key = item.getFlag?.(FLAG, "key");
  if ( !key || !item.parent || (item.parent.documentName !== "Actor") ) return;
  const { syncActor } = await import("./build.mjs");
  const actor = item.parent;
  if ( (item.getFlag(FLAG, "category") === "threk") && (key !== "threk-dice") && !actor.items.some(i => i.getFlag(FLAG, "key") === "threk-dice") ) {
    await addToActor(actor, ["threk-dice"]);
  }
  await syncActor(actor);
}

/* ---------------- Actor choice ---------------- */

export function defaultActor() {
  const token = canvas?.tokens?.controlled?.[0]?.actor;
  return token ?? game.user.character ?? null;
}

function actorOptions(selected) {
  const actors = game.actors.filter(a => a.isOwner && ["character", "npc"].includes(a.type));
  return actors.map(a => `<option value="${a.id}" ${a.id === selected?.id ? "selected" : ""}>${esc(a.name)}</option>`).join("");
}

/* ---------------- Add dialog (dropdown) ---------------- */

export async function openAddDialog(actor = null) {
  const entries = await catalog();
  const cats = CATEGORIES.filter(c => c.id !== "burden");
  const selected = actor ?? defaultActor();
  const content = `
    <div class="form-group"><label>Character</label><div class="form-fields"><select name="actor">${actorOptions(selected)}</select></div></div>
    <div class="form-group"><label>Section</label><div class="form-fields"><select name="category">${cats.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join("")}</select></div></div>
    <div class="form-group"><label>Item</label><div class="form-fields"><select name="entry"></select></div></div>
    <p class="hint">Add everything adds the whole section, for example every Þrek Art or every Fable.</p>`;

  const fill = dialog => {
    const form = dialog.element.querySelector("form") ?? dialog.element;
    const cat = form.querySelector("[name=category]");
    const entry = form.querySelector("[name=entry]");
    const refresh = () => {
      const list = entries.filter(e => e.category === cat.value);
      entry.innerHTML = list.map(e => `<option value="${esc(e.key)}">${esc(e.name)}${e.sub ? ` (${esc(e.sub)})` : ""}</option>`).join("");
    };
    cat.addEventListener("change", refresh);
    refresh();
  };

  const run = async (all, event, button) => {
    const fd = new foundry.applications.ux.FormDataExtended(button.form).object;
    const target = game.actors.get(fd.actor);
    if ( !target ) return ui.notifications.warn("Choose a character first.");
    const keys = all ? entries.filter(e => e.category === fd.category).map(e => e.key) : [fd.entry];
    const added = await addToActor(target, keys.filter(k => k !== "__burden__"), { fables: await loadFables() });
    ui.notifications.info(added.length ? `Added to ${target.name}: ${added.join(", ")}` : `${target.name} already has those.`);
  };

  return foundry.applications.api.DialogV2.wait({
    window: { title: "Add to character" }, content, rejectClose: false,
    render: (event, dialog) => fill(dialog),
    buttons: [
      { action: "one", label: "Add", default: true, callback: (e, b) => run(false, e, b) },
      { action: "all", label: "Add everything in section", callback: (e, b) => run(true, e, b) },
      { action: "kit", label: "Trace kit", callback: async (e, b) => {
        const fd = new foundry.applications.ux.FormDataExtended(b.form).object;
        const target = game.actors.get(fd.actor);
        if ( !target ) return;
        const keys = [...CORE_KEYS, ...THREK_KEYS()];
        const added = await addToActor(target, keys, { fables: await loadFables() });
        ui.notifications.info(`Trace kit: added ${added.length} items to ${target.name}.`);
      } },
      { action: "cancel", label: "Close" }
    ]
  });
}

const THREK_KEYS = () => POWERS.filter(p => p.category === "threk").map(p => p.key);

/* ---------------- Library window ---------------- */

export class TraceLibrary extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "trace-5e-library", classes: ["trace-library"],
    window: { title: "Trace 5.5e Library", resizable: true, icon: "fa-solid fa-book-open" },
    position: { width: 640, height: 640 }
  };

  category = "fable";
  query = "";
  actorId = null;

  async _renderHTML() {
    const entries = await catalog();
    const uuids = await uuidIndex();
    const q = this.query.toLowerCase();
    const list = entries.filter(e => e.category === this.category && (!q || `${e.name} ${e.sub} ${e.clan ?? ""}`.toLowerCase().includes(q)));
    const tabs = CATEGORIES.map(c => `<a data-cat="${c.id}" class="${c.id === this.category ? "active" : ""}">${esc(c.label)}</a>`).join("");
    const rows = list.map(e => {
      const uuid = uuids[e.key];
      const drag = uuid ? `draggable="true" data-uuid="${esc(uuid)}"` : "";
      return `<li class="trace-row-item" ${drag} data-key="${esc(e.key)}">
        <span class="name">${esc(e.name)}</span><span class="sub">${esc(e.sub ?? "")}</span>
        ${e.key === "__burden__" ? "" : `<button type="button" data-add="${esc(e.key)}" title="Add to the chosen character"><i class="fa-solid fa-plus"></i></button>`}</li>`;
    }).join("");
    const gm = game.user.isGM;
    return `<div class="trace-library-body">
      <div class="trace-toolbar">
        <select name="actor">${actorOptions(this.actorId ? game.actors.get(this.actorId) : defaultActor())}</select>
        <input type="search" name="q" placeholder="Search" value="${esc(this.query)}">
        ${gm ? `<button type="button" data-rebuild title="Rebuild the Trace 5.5e compendium"><i class="fa-solid fa-hammer"></i></button>` : ""}
      </div>
      <nav class="trace-cats">${tabs}</nav>
      <p class="trace-muted">Drag a row onto a character sheet, or press + to add it to the character above.${uuids.fable ? "" : ""}</p>
      <ul class="trace-list-items">${rows || "<li class='trace-muted'>Nothing here.</li>"}</ul>
      ${["threk", "fable", "seidr"].includes(this.category) ? `<button type="button" data-add-all>Add all shown to the character</button>` : ""}
    </div>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
    const body = content.querySelector(".trace-library-body");
    body.querySelectorAll("[data-cat]").forEach(a => a.addEventListener("click", () => { this.category = a.dataset.cat; this.render(); }));
    body.querySelector("[name=q]")?.addEventListener("change", e => { this.query = e.target.value; this.render(); });
    body.querySelector("[name=actor]")?.addEventListener("change", e => { this.actorId = e.target.value; });
    body.querySelectorAll("[data-uuid]").forEach(li => li.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: li.dataset.uuid }));
    }));
    const target = () => game.actors.get(body.querySelector("[name=actor]")?.value);
    body.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", async () => {
      const actor = target(); if ( !actor ) return ui.notifications.warn("Choose a character first.");
      const added = await addToActor(actor, [b.dataset.add], { fables: await loadFables() });
      ui.notifications.info(added.length ? `Added ${added.join(", ")} to ${actor.name}.` : `${actor.name} already has it.`);
    }));
    body.querySelector("[data-add-all]")?.addEventListener("click", async () => {
      const actor = target(); if ( !actor ) return ui.notifications.warn("Choose a character first.");
      const keys = [...body.querySelectorAll("[data-key]")].map(li => li.dataset.key).filter(k => k !== "__burden__");
      const added = await addToActor(actor, keys, { fables: await loadFables() });
      ui.notifications.info(`Added ${added.length} items to ${actor.name}.`);
    });
    body.querySelector("[data-rebuild]")?.addEventListener("click", async () => { await buildCompendium({ force: true }); this.render(); });
  }
}

let library = null;
export function openLibrary(actor = null) {
  library ??= new TraceLibrary();
  if ( actor ) library.actorId = actor.id;
  return library.render({ force: true });
}

/* ---------------- Macros ---------------- */

const MACROS = [
  { name: "Trace: Library", command: `game.modules.get("trace-5e").api.openLibrary();` },
  { name: "Trace: Add to character", command: `game.modules.get("trace-5e").api.openAddDialog();` },
  { name: "Trace: Add the Trace kit to selected token", command:
`const api = game.modules.get("trace-5e").api;
const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if ( !actor ) return ui.notifications.warn("Select a token first.");
const added = await api.addKit(actor);
ui.notifications.info("Added " + added.length + " Trace items to " + actor.name);` },
  { name: "Trace: Add every Þrek Art to selected token", command:
`const api = game.modules.get("trace-5e").api;
const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if ( !actor ) return ui.notifications.warn("Select a token first.");
await api.addCategory(actor, "threk");` },
  { name: "Trace: Add a Fable by name", command:
`const api = game.modules.get("trace-5e").api;
const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if ( !actor ) return ui.notifications.warn("Select a token first.");
const name = await foundry.applications.api.DialogV2.prompt({ window: { title: "Add a Fable" }, content: '<input type="text" name="n" placeholder="Fable name">', ok: { callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object.n } });
if ( name ) await api.addByName(actor, name);` }
];

export async function createMacros() {
  if ( !game.user.isGM ) return;
  let folder = game.folders.find(f => f.type === "Macro" && f.getFlag(FLAG, "folder"));
  if ( !folder ) folder = await Folder.create({ name: "Trace 5.5e", type: "Macro", flags: { [FLAG]: { folder: true } } });
  for ( const m of MACROS ) {
    const have = game.macros.find(x => x.getFlag(FLAG, "macro") === m.name);
    if ( have ) { if ( have.command !== m.command ) await have.update({ command: m.command }); continue; }
    await Macro.create({ name: m.name, type: "script", img: "icons/svg/book.svg", command: m.command, folder: folder.id, flags: { [FLAG]: { macro: m.name } } });
  }
}

/* ---------------- Public API helpers ---------------- */

export async function addKit(actor) {
  return addToActor(actor, [...CORE_KEYS, ...THREK_KEYS()], { fables: await loadFables() });
}

export async function addCategory(actor, category) {
  const entries = await catalog();
  const keys = entries.filter(e => e.category === category && e.key !== "__burden__").map(e => e.key);
  const added = await addToActor(actor, keys, { fables: await loadFables() });
  ui.notifications.info(`Added ${added.length} items to ${actor.name}.`);
  return added;
}

export async function addByName(actor, name) {
  const entries = await catalog();
  const n = name.trim().toLowerCase();
  const hit = entries.find(e => e.name.toLowerCase() === n) ?? entries.find(e => e.name.toLowerCase().includes(n));
  if ( !hit ) return ui.notifications.warn(`No Trace entry called "${name}".`);
  const added = await addToActor(actor, [hit.key], { fables: await loadFables() });
  ui.notifications.info(added.length ? `Added ${added.join(", ")} to ${actor.name}.` : `${actor.name} already has ${hit.name}.`);
  return added;
}
