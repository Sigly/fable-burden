/**
 * Pure Trace rules logic. No Foundry globals, so it can be unit tested in Node.
 */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
export const ABILITY_CAP = 24;

/* ---------------- Þrek ---------------- */

const THREK_ROWS = [
  [1, 2, 6, 2], [3, 3, 6, 3], [5, 3, 8, 3], [7, 4, 8, 4], [10, 4, 10, 5], [15, 5, 10, 6], [18, 5, 12, 6]
];

/** Þrek dice, die size and Arts known at a character level. */
export function threkFor(level) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  let row = THREK_ROWS[0];
  for ( const r of THREK_ROWS ) if ( lvl >= r[0] ) row = r;
  return { dice: row[1], die: row[2], arts: row[3], rekindle: lvl >= 15 };
}

/* ---------------- Seiðr ---------------- */

export const SEIDR_COST = Object.freeze({ 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13 });
const SEIDR_POINTS = { 1: 4, 2: 6, 3: 14, 4: 17, 5: 27, 6: 32, 7: 38 };
const SEIDR_MAX_SPELL = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4 };

/** Seiðr summary at a character level. Seiðr level is one third of character level, rounded up. */
export function seidrFor(level) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  const seidrLevel = Math.min(7, Math.ceil(lvl / 3));
  return {
    seidrLevel,
    points: SEIDR_POINTS[seidrLevel],
    maxSpellLevel: SEIDR_MAX_SPELL[seidrLevel],
    cantrips: lvl >= 10 ? 3 : 2,
    spellsKnown: seidrLevel + 2
  };
}

export const seidrCost = spellLevel => SEIDR_COST[spellLevel] ?? null;

/** Save DC for Þrek Arts and Seiðr spells and Fable powers. */
export const saveDC = (prof, mod) => 8 + Number(prof) + Number(mod);

/* ---------------- Renown, Megin, Epithet ---------------- */

export const clampRenown = n => Math.max(0, Math.min(100, Math.floor(Number(n) || 0)));
export const meginRating = renown => Math.min(10, Math.floor(clampRenown(renown) / 10));

/** Passive abilities an Epithet may hold: none below 20, 1 at 20, 2 at 50, 3 at 80. */
export function epithetSlots(renown) {
  const r = clampRenown(renown);
  return r >= 80 ? 3 : r >= 50 ? 2 : r >= 20 ? 1 : 0;
}

/* ---------------- Idolization ---------------- */

export const IDOLIZATION_FORMS = Object.freeze({
  maxim: { label: "Maxim", minMegin: 2, tempMult: 5, passives: 1, bonuses: [2], needsRareFable: true },
  partial: { label: "Partial Idolization", minMegin: 5, tempMult: 10, passives: 2, bonuses: [2, 2] },
  ascension: { label: "Ascension", minMegin: 8, tempMult: 15, passives: 3, bonuses: [4, 2, 2] }
});

export const EXHAUSTION_AFTER = 3;

/**
 * Work out what an Idolization does.
 * @param {string} form       maxim, partial or ascension
 * @param {object} o
 * @param {number} o.prof     proficiency bonus
 * @param {number} o.megin    Megin rating
 * @param {number} o.spellMod Seiðr spellcasting modifier, for the DC of the active
 * @param {Record<string, number>} o.scores  current ability scores
 * @param {string[]} o.picks  abilities chosen for each bonus, in the order of the form's bonuses
 */
export function idolizationFor(form, { prof, megin, spellMod = 0, scores = {}, picks = [] }) {
  const f = IDOLIZATION_FORMS[form];
  if ( !f ) throw new Error(`Unknown Idolization form: ${form}`);
  const available = megin >= f.minMegin;
  const bonuses = [];
  f.bonuses.forEach((amount, i) => {
    const ability = picks[i];
    if ( !ability ) return;
    const current = Number(scores[ability] ?? 10);
    bonuses.push({ ability, amount, applied: Math.max(0, Math.min(amount, ABILITY_CAP - current)) });
  });
  return {
    form, label: f.label, available,
    tempHp: f.tempMult * prof,
    durationRounds: 2 * megin,
    passives: f.passives,
    activeLevel: Math.min(5, prof),
    dc: saveDC(prof, spellMod),
    bonuses,
    needsRareFable: !!f.needsRareFable
  };
}
