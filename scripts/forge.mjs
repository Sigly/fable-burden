/**
 * Seiðr Spell Forge (GM only).
 * Works on the world compendium "Spells 5.5e" (world.spells-55e):
 *   1. keeps one copy of each spell, preferring the 2024 version, and removes 2014 duplicates
 *   2. sorts the spells into folders by spell level
 *   3. renames every spell to its Seiðr name
 *   4. adds a copy of every spell to a "Seidr" folder, with the creator and chant at the top of the description
 *   5. renames the matching spells on every actor (no chant is added there)
 * Everything is previewed first. Running it twice is safe.
 */
import { MODULE_ID as FLAG } from "./burden-core.mjs";

export const FORGE_PACK = "world.spells-55e";
const LEVEL_NAMES = ["Cantrips", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Level 8", "Level 9"];
const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");

let DATA = null;
export async function loadSeidrData() {
  if ( DATA ) return DATA;
  const res = await fetch(`modules/${FLAG}/scripts/data/seidr-spells.json`);
  DATA = await res.json();
  return DATA;
}

/** Lookup tables: any known name (original, alias, or Seiðr name) -> entry. */
export function buildLookup(data) {
  const byOriginal = new Map(); const bySeidr = new Map();
  for ( const s of data.spells ) {
    for ( const n of [s.original, ...(s.aka ?? [])] ) byOriginal.set(n.toLowerCase(), s);
    bySeidr.set(s.name.toLowerCase(), s);
  }
  return { byOriginal, bySeidr };
}

/** Seiðr name for a spell name, or null if there is none. Already-Seiðr names return themselves. */
export async function seidrNameFor(name) {
  const { byOriginal } = buildLookup(await loadSeidrData());
  return byOriginal.get(String(name).toLowerCase())?.name ?? null;
}

export function chantHtml(entry) {
  return `<div class="trace-chant"><p><strong>Creator:</strong> ${esc(entry.epithet)}</p>`
    + `<p><strong>Chant:</strong> <em>${esc(entry.chant)}</em></p></div><hr>`;
}

const rulesOf = e => foundry.utils.getProperty(e, "system.source.rules") ?? "";
const levelOf = e => Math.max(0, Math.min(9, Number(foundry.utils.getProperty(e, "system.level") ?? 0)));
const isSeidrCopy = e => !!foundry.utils.getProperty(e, `flags.${FLAG}.seidrCopy`);

/** Work out what the forge would do, without changing anything. */
export async function planForge() {
  const data = await loadSeidrData();
  const { byOriginal, bySeidr } = buildLookup(data);
  const pack = game.packs.get(FORGE_PACK);
  if ( !pack ) throw new Error(`Compendium ${FORGE_PACK} (Spells 5.5e) was not found.`);
  const index = (await pack.getIndex({ fields: ["system.level", "system.source.rules", `flags.${FLAG}.seidrCopy`] })).contents
    .filter(e => e.type === "spell");
  const main = index.filter(e => !isSeidrCopy(e));
  const copies = index.filter(isSeidrCopy);

  // Group main entries by the spell they represent.
  const groups = new Map();
  const noData = [];
  for ( const e of main ) {
    const lower = e.name.toLowerCase();
    const entry = byOriginal.get(lower) ?? bySeidr.get(lower) ?? null;
    const key = entry ? `s:${entry.original.toLowerCase()}` : `n:${lower}`;
    if ( !groups.has(key) ) groups.set(key, { entry, members: [] });
    groups.get(key).members.push(e);
    if ( !entry ) noData.push(e.name);
  }
  const keep = []; const remove = []; const only2014 = [];
  for ( const g of groups.values() ) {
    const modern = g.members.filter(m => rulesOf(m) === "2024" || String(m._id).startsWith("phbspl"));
    if ( modern.length ) {
      keep.push({ doc: modern[0], entry: g.entry });
      for ( const m of g.members ) if ( m !== modern[0] ) remove.push(m);
    } else {
      // No 2024 version: keep one, report it.
      keep.push({ doc: g.members[0], entry: g.entry });
      for ( const m of g.members.slice(1) ) remove.push(m);
      if ( rulesOf(g.members[0]) === "2014" ) only2014.push(g.members[0].name);
    }
  }
  const copyNames = new Set(copies.map(c => c.name.toLowerCase()));
  const toCopy = keep.filter(k => k.entry && !copyNames.has(k.entry.name.toLowerCase()));
  const toRename = keep.filter(k => k.entry && k.doc.name !== k.entry.name);

  // Actor spells
  const actorRenames = [];
  const collect = (actor, label) => {
    for ( const item of actor.items ) {
      if ( item.type !== "spell" ) continue;
      const entry = byOriginal.get(item.name.toLowerCase());
      if ( entry && entry.name !== item.name ) actorRenames.push({ actor, item, entry, label });
    }
  };
  for ( const actor of game.actors ) collect(actor, actor.name);
  for ( const scene of game.scenes ) for ( const token of scene.tokens ) {
    if ( token.actorLink || !token.actor ) continue;
    collect(token.actor, `${token.name} (token on ${scene.name})`);
  }
  const worldItems = game.items.filter(i => i.type === "spell" && byOriginal.get(i.name.toLowerCase())?.name !== i.name && byOriginal.has(i.name.toLowerCase()));

  return { pack, data, keep, remove, only2014, noData, toCopy, toRename, actorRenames, worldItems, existingCopies: copies.length };
}

async function ensureFolder(pack, name, parent = null) {
  const found = pack.folders.find(f => f.name === name && (f.folder?.id ?? null) === (parent?.id ?? null));
  if ( found ) return found;
  return Folder.create({ name, type: "Item", folder: parent?.id ?? null }, { pack: pack.collection });
}

/** Apply a plan from planForge(). Returns a summary object. */
export async function runForge(plan, { onProgress } = {}) {
  const { pack } = plan;
  const say = msg => { onProgress?.(msg); console.log("Trace 5.5e forge |", msg); };
  const wasLocked = pack.locked;
  if ( wasLocked ) await pack.configure({ locked: false });
  const summary = { removed: 0, renamed: 0, copied: 0, moved: 0, actorsRenamed: 0 };
  try {
    say("Making folders");
    const levelFolders = []; const seidrLevelFolders = [];
    const seidrRoot = await ensureFolder(pack, "Seidr");
    for ( let l = 0; l <= 9; l++ ) {
      levelFolders[l] = await ensureFolder(pack, LEVEL_NAMES[l]);
      seidrLevelFolders[l] = await ensureFolder(pack, LEVEL_NAMES[l], seidrRoot);
    }

    if ( plan.remove.length ) {
      say(`Removing ${plan.remove.length} duplicate spells`);
      await Item.deleteDocuments(plan.remove.map(r => r._id), { pack: pack.collection });
      summary.removed = plan.remove.length;
    }

    say("Sorting by level and renaming");
    const updates = plan.keep.map(k => {
      const u = { _id: k.doc._id, folder: levelFolders[levelOf(k.doc)].id };
      if ( k.entry && k.doc.name !== k.entry.name ) u.name = k.entry.name;
      return u;
    });
    for ( let i = 0; i < updates.length; i += 100 ) await Item.updateDocuments(updates.slice(i, i + 100), { pack: pack.collection });
    summary.moved = updates.length;
    summary.renamed = plan.toRename.length;

    if ( plan.toCopy.length ) {
      say(`Copying ${plan.toCopy.length} spells into the Seidr folder`);
      const docs = [];
      for ( const k of plan.toCopy ) {
        const source = await pack.getDocument(k.doc._id);
        if ( !source ) continue;
        const d = source.toObject();
        delete d._id;
        d.name = k.entry.name;
        d.folder = seidrLevelFolders[levelOf(k.doc)].id;
        d.system.description.value = chantHtml(k.entry) + (d.system.description?.value ?? "");
        d.flags = foundry.utils.mergeObject(d.flags ?? {}, { [FLAG]: { seidrCopy: true, creator: k.entry.epithet } });
        d.ownership = { default: 0 };
        docs.push(d);
      }
      for ( let i = 0; i < docs.length; i += 50 ) {
        await Item.createDocuments(docs.slice(i, i + 50), { pack: pack.collection });
        say(`Copied ${Math.min(i + 50, docs.length)} of ${docs.length}`);
      }
      summary.copied = docs.length;
    }
  } finally {
    if ( wasLocked ) await pack.configure({ locked: true }).catch(() => {});
  }

  say("Renaming spells on characters and creatures");
  const byDoc = new Map();
  for ( const r of plan.actorRenames ) {
    const list = byDoc.get(r.actor) ?? []; list.push({ _id: r.item.id, name: r.entry.name }); byDoc.set(r.actor, list);
  }
  for ( const [actor, list] of byDoc ) {
    try { await actor.updateEmbeddedDocuments("Item", list); summary.actorsRenamed += list.length; }
    catch(err) { console.error("Trace 5.5e forge | could not rename on", actor.name, err); }
  }
  if ( plan.worldItems.length ) {
    const { byOriginal } = buildLookup(plan.data);
    await Item.updateDocuments(plan.worldItems.map(i => ({ _id: i.id, name: byOriginal.get(i.name.toLowerCase()).name })));
    summary.actorsRenamed += plan.worldItems.length;
  }
  say("Done");
  return summary;
}

/** The preview dialog. */
export async function openSeidrForge() {
  if ( !game.user.isGM ) return ui.notifications.warn("Only a GM can run the Seiðr forge.");
  let plan;
  try { plan = await planForge(); } catch(err) { return ui.notifications.error(err.message); }
  const list = (arr, max = 12) => arr.length ? `<small>${arr.slice(0, max).map(esc).join(", ")}${arr.length > max ? `, and ${arr.length - max} more` : ""}</small>` : "";
  const actorCount = new Set(plan.actorRenames.map(r => r.actor)).size;
  const content = `<div class="trace-forge">
    <p>This changes the <strong>Spells 5.5e</strong> compendium and the spells on your characters and creatures. <strong>Make a backup of the world first.</strong></p>
    <ul>
      <li>Keep one copy of each spell, preferring 2024. Remove <strong>${plan.remove.length}</strong> duplicates. ${list(plan.remove.map(r => r.name))}</li>
      <li>Sort <strong>${plan.keep.length}</strong> spells into level folders.</li>
      <li>Rename <strong>${plan.toRename.length}</strong> spells to their Seiðr names.</li>
      <li>Add <strong>${plan.toCopy.length}</strong> spells to the Seidr folder with a creator and chant (${plan.existingCopies} already there).</li>
      <li>Rename <strong>${plan.actorRenames.length}</strong> spells on <strong>${actorCount}</strong> actors or tokens, with no chant. ${list(plan.actorRenames.map(r => `${r.item.name} on ${r.label}`))}</li>
      ${plan.only2014.length ? `<li>2014-only spells with no 2024 version are kept: ${list(plan.only2014)}</li>` : ""}
      ${plan.noData.length ? `<li>No Seiðr name yet for <strong>${plan.noData.length}</strong> spells, left as they are: ${list(plan.noData, 20)}</li>` : ""}
    </ul></div>`;
  const go = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Seiðr Spell Forge" }, content, yes: { label: "Run it" }, no: { label: "Cancel" }, rejectClose: false, modal: true
  });
  if ( !go ) return null;
  ui.notifications.info("Seiðr forge running. This can take a minute.");
  const summary = await runForge(plan);
  ui.notifications.info(`Seiðr forge done: ${summary.removed} removed, ${summary.renamed} renamed, ${summary.copied} copied to Seidr, ${summary.actorsRenamed} renamed on actors.`);
  return summary;
}
