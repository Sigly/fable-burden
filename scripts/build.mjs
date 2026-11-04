/**
 * Turns Trace definitions into Foundry item data, and keeps actors' Trace items wired together.
 * Foundry globals are used only inside functions, so the module can be imported in Node tests.
 */
import { MODULE_ID } from "./burden-core.mjs";
import { threkFor, seidrFor, seidrCost } from "./core.mjs";
import { POWERS, THREK_ARTS } from "./data/powers.mjs";

export const FLAG = MODULE_ID;
const rid = () => foundry.utils.randomID();

export const RARITY_KEY = {
  Common: "common", Uncommon: "uncommon", Rare: "rare", Epic: "veryRare",
  Unique: "unique", Legendary: "legendary", Mythical: "mythical", Artifact: "artifact"
};

const SEIDR_SPELLS = {
  0: ["Fire Bolt", "Frostbite", "Ray of Frost", "Shocking Grasp", "Thunderclap"],
  1: ["Absorb Elements", "Burning Hands", "Ice Knife", "Shield", "Thunderwave"],
  2: ["Flame Blade", "Gust of Wind", "Levitate", "Scorching Ray", "Shatter"],
  3: ["Fireball", "Lightning Bolt", "Sleet Storm", "Wind Wall"],
  4: ["Fire Shield", "Ice Storm", "Stoneskin", "Wall of Fire"]
};
export const seidrSpellList = () => Object.entries(SEIDR_SPELLS)
  .flatMap(([level, names]) => names.map(name => ({ name, level: Number(level) })));

/* ---------------- text ---------------- */

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Minimal markdown (paragraphs, bold, italics) to HTML, enough for Fable entries. */
export function mdToHtml(md) {
  return md.split(/\n{2,}/).map(par => {
    let t = esc(par.trim());
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    return t ? `<p>${t}</p>` : "";
  }).join("\n");
}

const activationOf = text => {
  const t = (text ?? "").toLowerCase();
  if ( t.includes("reaction") ) return "reaction";
  if ( t.includes("bonus") ) return "bonus";
  if ( t.includes("action") ) return "action";
  return "special";
};

/* ---------------- activities ---------------- */

function activityData(def) {
  const id = rid();
  const base = {
    _id: id, name: def.name, sort: 0,
    activation: { type: def.activation || "", override: true, value: null },
    consumption: { scaling: { allowed: false }, spellSlot: false, targets: [] },
    description: { chatFlavor: "" }, effects: [],
    flags: { [FLAG]: { spend: def.spend ?? null, template: def.template ?? "", temp: !!def.temp } }
  };
  const part = formula => ({ number: null, denomination: null, bonus: "", types: [], custom: { enabled: true, formula }, scaling: { mode: "", number: null, formula: "" } });
  if ( def.kind === "save" ) {
    return { ...base, type: "save",
      save: { ability: [def.save ?? "con"], dc: { calculation: "", formula: "8 + @prof" } },
      damage: { onSave: "none", parts: def.template ? [part(def.template.replace("{die}", "d6"))] : [] } };
  }
  if ( def.kind === "heal" ) {
    return { ...base, type: "heal",
      healing: { ...part((def.template ?? "1{die}").replace("{die}", "d6").replace("{mod}", "0")), types: [def.temp ? "temphp" : "healing"] } };
  }
  const rolls = (def.kind === "die") || (def.kind === "diemod") || !!def.roll;
  return { ...base, type: "utility",
    roll: { formula: rolls ? (def.template ?? "").replace("{die}", "d6").replace("{mod}", "0") : "", name: def.roll?.name ?? def.roll ?? "", prompt: false, visible: rolls } };
}

/** Item data for one POWERS entry. */
export function buildPower(def) {
  const activities = {};
  for ( const a of def.activities ?? [] ) {
    const act = activityData(a);
    activities[act._id] = act;
  }
  const system = { description: { value: def.desc }, type: { value: "", subtype: "" }, activities, uses: { max: "", spent: 0, recovery: [] } };
  if ( def.uses ) {
    system.uses = { max: String(def.uses.max), spent: 0, recovery: [{ period: def.uses.recovery, type: "recoverAll" }] };
  }
  if ( def.pool === "threk" ) system.uses = { max: "2", spent: 0, recovery: [{ period: "sr", type: "recoverAll" }, { period: "lr", type: "recoverAll" }] };
  if ( def.pool === "seidr" ) system.uses = { max: "4", spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] };
  return {
    name: def.name, type: "feat", img: def.img, system,
    flags: { [FLAG]: { key: def.key, category: def.category, pool: def.pool ?? null } }
  };
}

/** Item data for one Fable from fables.json. */
export function buildFable(f) {
  const body = f.md;
  const activities = {};
  for ( const m of body.matchAll(/\*\*Blueprint, (.+?)\s*\(([^)]*)\)\.\*\*/g) ) {
    const a = activityData({ name: `Blueprint: ${m[1]}`, kind: "utility", activation: activationOf(m[2]) });
    activities[a._id] = a;
  }
  const mx = body.match(/\*\*Maxim, (.+?)\s*\(([^)]*)\)\.\*\*/);
  if ( mx ) {
    const a = activityData({ name: `Maxim: ${mx[1]}`, kind: "utility", activation: "special" });
    activities[a._id] = a;
  }
  const rarity = RARITY_KEY[f.tier] ?? "common";
  const allowed = globalThis.CONFIG?.DND5E?.itemRarity ?? {};
  const rarityKey = (Object.keys(allowed).length && !(rarity in allowed)) ? "legendary" : rarity;
  const header = `<p><strong>${esc(f.tier)} Fable.</strong> Holder: ${esc(f.holder)}. Idol: ${esc(f.idol)}. Burden ${f.burden}, minimum level ${esc(f.level)}. Clan: ${esc(f.clan)}.</p>`;
  const system = {
    description: { value: header + mdToHtml(body) },
    type: { value: "trinket", baseItem: "" }, rarity: rarityKey, equipped: true, quantity: 1, weight: { value: 0, units: "lb" },
    activities
  };
  if ( mx ) system.uses = { max: "1", spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] };
  return {
    name: f.name, type: "equipment", img: "icons/svg/book.svg", system,
    flags: { [FLAG]: { key: `fable-${f.num}`, category: "fable", tier: f.tier, burden: f.burden, minLevel: f.level, idol: f.idol, holder: f.holder, clan: f.clan, num: f.num } }
  };
}

/** Turn spell item data into a Seiðr spell: innate, no slot, paid for with Seiðr Points. */
export function seidrizeSpellData(data, seidrItemId, abilityKey) {
  data = foundry.utils.deepClone(data);
  delete data._id;
  const level = Number(data.system?.level ?? 0);
  data.system.method = level === 0 ? "atwill" : "innate";
  data.system.prepared = 1;
  if ( abilityKey ) data.system.ability = abilityKey;
  // Seiðr needs no material components.
  if ( data.system.properties ) data.system.properties = Array.from(data.system.properties).filter(p => p !== "material");
  const cost = seidrCost(level);
  for ( const act of Object.values(data.system.activities ?? {}) ) {
    act.consumption ??= {};
    act.consumption.spellSlot = false;
    act.consumption.targets = (level > 0 && seidrItemId) ? [{ type: "itemUses", target: seidrItemId, value: String(cost) }] : [];
    if ( abilityKey ) {
      if ( act.type === "save" ) act.save = { ...act.save, dc: { ...(act.save?.dc ?? {}), calculation: abilityKey } };
      if ( act.type === "attack" ) act.attack = { ...(act.attack ?? {}), ability: abilityKey };
    }
  }
  data.flags ??= {};
  data.flags[FLAG] = { key: `seidr-${slugKey(data.name)}`, category: "seidr", seidrSpell: true, spellLevel: level };
  return data;
}

const slugKey = n => String(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\W+/g, "-");

/** Item data for a Seiðr spell copied from a system compendium. */
export async function buildSeidrSpell(name, level, seidrItemId, abilityKey) {
  const pack = ["dnd5e.spells24", "dnd5e.spells"].map(id => game.packs.get(id)).filter(Boolean);
  let source = null;
  for ( const p of pack ) {
    const entry = (await p.getIndex()).find(e => e.name === name);
    if ( entry ) { source = await p.getDocument(entry._id); break; }
  }
  if ( !source ) return null;
  const data = source.toObject();
  return seidrizeSpellData(data, seidrItemId, abilityKey);
}

/**
 * Convert a dropped spell (a spell Item document) into a Seiðr spell on the actor.
 * @returns {Promise<Item|null>}
 */
export async function addDroppedSpell(actor, doc) {
  if ( doc?.type !== "spell" ) { ui.notifications.warn("Drop a spell here."); return null; }
  const level = Number(doc.system.level ?? 0);
  if ( level > 9 || !seidrCost(level) && level > 0 ) { ui.notifications.warn("That spell level has no Seiðr cost."); return null; }
  const key = `seidr-${slugKey(doc.name)}`;
  if ( actor.items.some(i => i.getFlag(FLAG, "key") === key) ) { ui.notifications.info(`${actor.name} already has ${doc.name} as a Seiðr spell.`); return null; }
  let pool = itemByKey(actor, "seidr-points");
  if ( !pool ) { await addToActor(actor, ["seidr-points"]); pool = itemByKey(actor, "seidr-points"); }
  const s = seidrFor(actorLevel(actor));
  if ( level > s.maxSpellLevel ) ui.notifications.warn(`${doc.name} is level ${level}. ${actor.name} can only cast Seiðr spells up to level ${s.maxSpellLevel}.`);
  const known = actor.items.filter(i => i.getFlag(FLAG, "seidrSpell") && (i.getFlag(FLAG, "spellLevel") > 0)).length;
  if ( level > 0 && known >= s.spellsKnown ) ui.notifications.warn(`${actor.name} already knows ${known} Seiðr spells (limit ${s.spellsKnown}).`);
  const raw = doc.toObject();
  const data = seidrizeSpellData(raw, pool?.id, actor.getFlag(FLAG, "seidrAbility") ?? "int");
  const [created] = await actor.createEmbeddedDocuments("Item", [data], { traceInternal: true });
  await syncActor(actor);
  return created;
}

/* ---------------- actor wiring ---------------- */

export const itemByKey = (actor, key) => actor.items.find(i => i.getFlag(FLAG, "key") === key);

export function actorLevel(actor) {
  const level = Number(actor.system?.details?.level);
  if ( Number.isFinite(level) && level > 0 ) return level;
  const cr = Number(actor.system?.details?.cr);   // NPCs: use challenge rating as a stand-in for level
  return Number.isFinite(cr) && cr > 0 ? Math.min(20, Math.max(1, Math.ceil(cr))) : 1;
}

/**
 * Bring an actor's Trace items into line: pool sizes from level, Art dice and DCs, and consumption links.
 * Safe to run any number of times.
 */
export async function syncActor(actor) {
  if ( !actor?.isOwner ) return;
  const level = actorLevel(actor);
  const updates = [];
  const threkAbility = actor.getFlag(FLAG, "threkAbility") ?? "str";
  const seidrAbility = actor.getFlag(FLAG, "seidrAbility") ?? "int";

  let threkPool = itemByKey(actor, "threk-dice");
  // Arts need the Þrek Dice pool. Create it if the actor has Arts but no pool.
  if ( !threkPool && actor.items.some(i => (i.getFlag(FLAG, "category") === "threk") && (i.getFlag(FLAG, "key") !== "threk-dice")) ) {
    const def = POWERS.find(p => p.key === "threk-dice");
    if ( def ) {
      const [created] = await actor.createEmbeddedDocuments("Item", [buildPower(def)], { traceInternal: true });
      threkPool = created;
    }
  }
  if ( threkPool ) {
    const t = threkFor(level);
    if ( String(threkPool.system.uses.max) !== String(t.dice) ) updates.push({ _id: threkPool.id, "system.uses.max": String(t.dice) });
  }
  const seidrPool = itemByKey(actor, "seidr-points");
  if ( seidrPool ) {
    const s = seidrFor(level);
    if ( String(seidrPool.system.uses.max) !== String(s.points) ) updates.push({ _id: seidrPool.id, "system.uses.max": String(s.points) });
  }

  const die = threkFor(level).die;
  for ( const item of actor.items ) {
    const cat = item.getFlag(FLAG, "category");
    if ( cat === "threk" && item.getFlag(FLAG, "key") !== "threk-dice" ) {
      const patch = { _id: item.id };
      let changed = false;
      for ( const act of item.system.activities ) {
        const meta = act.flags?.[FLAG] ?? {};
        const path = `system.activities.${act.id}`;
        const formula = (meta.template ?? "").replace("{die}", `d${die}`).replace("{mod}", `@abilities.${threkAbility}.mod`);
        if ( act.type === "utility" && meta.template ) {
          if ( act.roll?.formula !== formula ) { patch[`${path}.roll.formula`] = formula; changed = true; }
        }
        if ( act.type === "heal" && meta.template ) {
          if ( act.healing?.custom?.formula !== formula ) { patch[`${path}.healing.custom.formula`] = formula; patch[`${path}.healing.custom.enabled`] = true; changed = true; }
        }
        if ( act.type === "save" ) {
          const dc = `8 + @prof + @abilities.${threkAbility}.mod`;
          if ( act.save?.dc?.formula !== dc || act.save?.dc?.calculation !== "" ) {
            patch[`${path}.save.dc.formula`] = dc; patch[`${path}.save.dc.calculation`] = ""; changed = true;
          }
          if ( meta.template && (act.damage?.parts?.[0]?.custom?.formula !== formula) ) {
            const parts = foundry.utils.deepClone(act.toObject?.().damage?.parts ?? [{}]);
            parts[0] = { ...(parts[0] ?? {}), custom: { enabled: true, formula } };
            patch[`${path}.damage.parts`] = parts; changed = true;
          }
        }
        {   // every activity on an Art spends one Þrek die
          const have = act.consumption?.targets?.[0]?.target;
          if ( threkPool && (have !== threkPool.id) ) {
            patch[`${path}.consumption.targets`] = [{ type: "itemUses", target: threkPool.id, value: "1" }]; changed = true;
          } else if ( !threkPool && have ) {
            patch[`${path}.consumption.targets`] = []; changed = true;   // never leave a link to a missing pool
          }
        }
      }
      if ( changed ) updates.push(patch);
    } else if ( cat === "nid" ) {
      const patch = { _id: item.id }; let changed = false;
      for ( const act of item.system.activities ) {
        if ( act.type === "save" ) {
          const formula = "8 + @prof + @abilities.con.mod";
          if ( act.save?.dc?.formula !== formula || act.save?.dc?.calculation !== "" ) {
            patch[`system.activities.${act.id}.save.dc.formula`] = formula;
            patch[`system.activities.${act.id}.save.dc.calculation`] = ""; changed = true;
          }
        }
      }
      if ( changed ) updates.push(patch);
    } else if ( item.getFlag(FLAG, "seidrSpell") && !seidrPool ) {
      const patch = { _id: item.id }; let changed = false;
      for ( const act of item.system.activities ) {
        if ( act.consumption?.targets?.[0]?.target ) { patch[`system.activities.${act.id}.consumption.targets`] = []; changed = true; }
      }
      if ( changed ) updates.push(patch);
    } else if ( item.getFlag(FLAG, "seidrSpell") && seidrPool ) {
      const cost = seidrCost(item.getFlag(FLAG, "spellLevel") ?? 0);
      const patch = { _id: item.id }; let changed = false;
      if ( cost && item.system.ability !== seidrAbility ) { patch["system.ability"] = seidrAbility; changed = true; }
      for ( const act of item.system.activities ) {
        const target = act.consumption?.targets?.[0]?.target;
        if ( cost && target !== seidrPool.id ) {
          patch[`system.activities.${act.id}.consumption.targets`] = [{ type: "itemUses", target: seidrPool.id, value: String(cost) }];
          changed = true;
        }
      }
      if ( changed ) updates.push(patch);
    }
  }
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
}

/**
 * Add powers or Fables to an actor. Existing copies (same key) are skipped.
 * @param {Actor} actor
 * @param {string[]} keys   POWERS keys, "fable-N" keys, or "seidr-spell:Name:level"
 * @returns {Promise<string[]>} names added
 */
export async function addToActor(actor, keys, { fables = [] } = {}) {
  const have = new Set(actor.items.map(i => i.getFlag(FLAG, "key")).filter(Boolean));
  const toCreate = [];
  const needsThrekPool = keys.some(k => k.startsWith("threk-") && k !== "threk-dice");
  const needsSeidrPool = keys.some(k => k.startsWith("seidr-spell:"));
  const order = [...keys];
  if ( needsThrekPool && !order.includes("threk-dice") ) order.unshift("threk-dice");
  if ( needsSeidrPool && !order.includes("seidr-points") ) order.unshift("seidr-points");

  let seidrId = itemByKey(actor, "seidr-points")?.id;
  const seidrAbility = actor.getFlag(FLAG, "seidrAbility") ?? "int";
  const added = [];

  for ( const key of order ) {
    if ( have.has(key) ) continue;
    if ( key.startsWith("fable-") ) {
      const f = fables.find(x => `fable-${x.num}` === key);
      if ( f ) {
        const min = Number(f.level);
        if ( Number.isFinite(min) && (actorLevel(actor) < min) ) ui.notifications.warn(`${f.name} needs level ${min}. ${actor.name} is level ${actorLevel(actor)}.`);
        toCreate.push(buildFable(f)); have.add(key); added.push(f.name);
      }
    } else if ( key.startsWith("seidr-spell:") ) {
      const [, name, level] = key.split(":");
      const data = await buildSeidrSpell(name, Number(level), seidrId, seidrAbility);
      if ( data && !have.has(data.flags[FLAG].key) ) { toCreate.push(data); have.add(data.flags[FLAG].key); added.push(name); }
    } else {
      const def = POWERS.find(p => p.key === key);
      if ( def ) { toCreate.push(buildPower(def)); have.add(key); added.push(def.name); }
    }
    // Create the Seiðr pool first so the spells can point at it.
    if ( key === "seidr-points" && !seidrId && toCreate.length ) {
      const [created] = await actor.createEmbeddedDocuments("Item", toCreate.splice(0), { traceInternal: true });
      seidrId = created.id;
    }
  }
  if ( toCreate.length ) await actor.createEmbeddedDocuments("Item", toCreate, { traceInternal: true });
  await syncActor(actor);
  return added;
}

export { THREK_ARTS };
