/**
 * Pure Burden logic. Nothing here touches Foundry globals, so it can be unit tested outside of Foundry.
 */

export const MODULE_ID = "fable-burden";

/**
 * Default Burden for an item that used to need attunement, keyed by dnd5e item rarity.
 * "veryRare" is shown as Epic by this module. "unique" and "mythical" are added by this module.
 */
export const DEFAULT_RARITY_BURDEN = Object.freeze({
  common: 1,
  uncommon: 2,
  rare: 3,
  veryRare: 4,
  unique: 4,
  legendary: 5,
  mythical: 6,
  artifact: 7
});

/** Burden used when an item has no rarity, or a rarity that is not in the table. */
export const FALLBACK_BURDEN = 1;

/**
 * Turn the JSON from the rarity setting into a usable table. Bad input falls back to the defaults,
 * and individual bad entries fall back to their default.
 * @param {string|object} raw
 * @returns {Record<string, number>}
 */
export function parseRarityTable(raw) {
  const table = { ...DEFAULT_RARITY_BURDEN };
  let parsed = raw;
  if ( typeof raw === "string" ) {
    try { parsed = JSON.parse(raw); } catch(err) { return table; }
  }
  if ( !parsed || (typeof parsed !== "object") || Array.isArray(parsed) ) return table;
  for ( const [key, value] of Object.entries(parsed) ) {
    const n = Number(value);
    if ( Number.isFinite(n) && (n >= 0) ) table[key] = Math.floor(n);
  }
  return table;
}

/**
 * Read the explicit Burden flag from an item, if it has a usable one.
 * @param {object} item
 * @returns {number|null}
 */
export function explicitBurden(item) {
  const value = item?.flags?.[MODULE_ID]?.burden;
  if ( (value === null) || (value === undefined) || (value === "") ) return null;
  const n = Number(value);
  return Number.isFinite(n) && (n >= 0) ? Math.floor(n) : null;
}

/**
 * Work out what an item costs in Burden.
 * An explicit flag always wins. Otherwise only items that used to need attunement cost Burden,
 * using the rarity table. Optional-attunement items are free unless `optionalCounts` is set.
 * @param {object} item
 * @param {Record<string, number>} table
 * @param {object} [options]
 * @param {boolean} [options.optionalCounts=false]
 * @returns {number}
 */
export function itemBurden(item, table, { optionalCounts=false }={}) {
  const explicit = explicitBurden(item);
  if ( explicit !== null ) return explicit;
  const attunement = item?.system?.attunement;
  const counts = (attunement === "required") || ((attunement === "optional") && optionalCounts);
  if ( !counts ) return 0;
  const rarity = item?.system?.rarity;
  return table[rarity] ?? FALLBACK_BURDEN;
}

/**
 * Does this item currently weigh on its owner?
 * Stored items (inside a container) never count. Equippable items count while equipped.
 * Items with no equipped state (feats, for example) always count, which only matters when they carry a flag.
 * @param {object} item
 * @returns {boolean}
 */
export function isCarried(item) {
  if ( item?.system?.container ) return false;
  const equipped = item?.system?.equipped;
  if ( equipped === undefined ) return true;
  return equipped === true;
}

/**
 * Total Burden in use on an actor.
 * @param {Iterable<object>} items
 * @param {Record<string, number>} table
 * @param {object} [options]
 * @returns {{used: number, entries: {id: string, name: string, burden: number}[]}}
 */
export function usedBurden(items, table, options={}) {
  const entries = [];
  let used = 0;
  for ( const item of items ) {
    if ( !isCarried(item) ) continue;
    const burden = itemBurden(item, table, options);
    if ( !burden ) continue;
    used += burden;
    entries.push({ id: item.id, name: item.name, burden });
  }
  return { used, entries };
}

/**
 * How much Burden an actor can carry. A per-actor flag overrides the formula.
 * @param {object} actor
 * @param {number} [bonus=1]   Added to proficiency bonus.
 * @returns {number}
 */
export function capacityFor(actor, bonus=1) {
  const override = actor?.flags?.[MODULE_ID]?.capacity;
  if ( (override !== null) && (override !== undefined) && (override !== "") && Number.isFinite(Number(override)) ) {
    return Math.max(0, Math.floor(Number(override)));
  }
  const prof = Number(actor?.system?.attributes?.prof);
  return (Number.isFinite(prof) ? prof : 2) + Number(bonus);
}

/**
 * Would adding this Burden push an actor over capacity?
 * @param {number} used
 * @param {number} adding
 * @param {number} capacity
 * @returns {boolean}
 */
export function wouldExceed(used, adding, capacity) {
  return (adding > 0) && ((used + adding) > capacity);
}
