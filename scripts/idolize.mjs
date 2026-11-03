import { MODULE_ID as FLAG } from "./burden-core.mjs";
import { ABILITIES, IDOLIZATION_FORMS, EXHAUSTION_AFTER, idolizationFor, meginRating, clampRenown } from "./core.mjs";
import { itemByKey, actorLevel } from "./build.mjs";

const RARE_PLUS = new Set(["Rare", "Epic", "Unique", "Legendary", "Mythical", "Artifact"]);
const abilityName = k => CONFIG.DND5E.abilities[k]?.label ?? k.toUpperCase();
const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");

export const getRenown = actor => clampRenown(actor.getFlag(FLAG, "renown") ?? 0);
export const getMegin = actor => meginRating(getRenown(actor));
export const activeIdolization = actor => actor.effects.find(e => e.getFlag(FLAG, "idolization"));

export async function setRenown(actor, value) {
  const renown = clampRenown(value);
  await actor.setFlag(FLAG, "renown", renown);
  if ( renown < 20 && actor.getFlag(FLAG, "epithet") ) ui.notifications.info(`${actor.name} falls below 20 Renown and loses their Epithet.`);
}

function bearsRareFable(actor) {
  return actor.items.some(i => RARE_PLUS.has(i.getFlag(FLAG, "tier")) && i.system.equipped);
}

/** Ask the player to choose abilities, then apply the Idolization. */
export async function idolize(actor, form) {
  const def = IDOLIZATION_FORMS[form];
  if ( !def ) return;
  if ( activeIdolization(actor) ) return ui.notifications.warn(`${actor.name} is already Idolized.`);
  if ( actor.getFlag(FLAG, "idolizedSinceRest") ) return ui.notifications.warn(`${actor.name} has already Idolized since the last long rest.`);
  const megin = getMegin(actor);
  if ( megin < def.minMegin ) return ui.notifications.warn(`${def.label} needs Megin rating ${def.minMegin}. ${actor.name} has ${megin}.`);
  if ( def.needsRareFable && !bearsRareFable(actor) ) return ui.notifications.warn("Maxim needs you to bear a Rare or higher Fable of the Idol. Equip one first.");

  const prof = actor.system.attributes?.prof ?? 2;
  const scores = Object.fromEntries(ABILITIES.map(a => [a, actor.system.abilities[a]?.value ?? 10]));
  const options = ABILITIES.map(a => `<option value="${a}">${esc(abilityName(a))} (${scores[a]})</option>`).join("");
  const picks = def.bonuses.map((amount, i) => `
    <div class="form-group"><label>+${amount} to</label>
    <div class="form-fields"><select name="pick${i}">${options}</select></div></div>`).join("");
  const content = `
    <p>${esc(def.label)}: Megin rating ${megin}, lasts ${2 * megin} rounds.</p>
    ${picks}
    <div class="form-group"><label>Idol</label><div class="form-fields"><input type="text" name="idol" placeholder="Name of the Idol"></div></div>
    <div class="form-group"><label>Tie</label><div class="form-fields"><select name="tie">
      <option>Relic</option><option>Kin</option><option>Deed</option><option>Oath</option></select></div></div>
    <div class="form-group"><label>Active</label><div class="form-fields"><input type="text" name="active" placeholder="${form === "maxim" ? "The Fable's Maxim" : "The Idol's signature act"}"></div></div>
    <div class="form-group"><label>Passives</label><div class="form-fields"><input type="text" name="passives" placeholder="Up to ${def.passives}, decided by the Idol"></div></div>`;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Idolize: ${def.label}` }, content,
    ok: {
      label: "Idolize",
      callback: (event, button) => {
        const fd = new foundry.applications.ux.FormDataExtended(button.form).object;
        return fd;
      }
    },
    rejectClose: false
  });
  if ( !result ) return;

  const chosen = def.bonuses.map((_, i) => result[`pick${i}`]);
  if ( new Set(chosen).size !== chosen.length ) return ui.notifications.warn("Choose different abilities for each bonus.");
  const spellMod = actor.system.abilities[actor.getFlag(FLAG, "seidrAbility") ?? "int"]?.mod ?? 0;
  const calc = idolizationFor(form, { prof, megin, spellMod, scores, picks: chosen });

  const changes = calc.bonuses.filter(b => b.applied > 0).map(b => ({
    key: `system.abilities.${b.ability}.value`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(b.applied), priority: 20
  }));
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: `Idolization: ${def.label}`, img: "icons/svg/aura.svg", changes,
    duration: { value: calc.durationRounds, units: "rounds" },
    description: `<p>${esc(result.idol)}. Tie: ${esc(result.tie)}. Active: ${esc(result.active)}. Passives: ${esc(result.passives)}.</p>`,
    flags: { [FLAG]: { idolization: true, form, idol: result.idol, tie: result.tie, lastStandUsed: false } }
  }]);

  const temp = Math.max(actor.system.attributes.hp.temp ?? 0, calc.tempHp);
  await actor.update({ "system.attributes.hp.temp": temp, [`flags.${FLAG}.idolizedSinceRest`]: true });

  const capped = calc.bonuses.filter(b => b.applied < b.amount).map(b => abilityName(b.ability));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<h3>${esc(actor.name)} Idolizes: ${esc(def.label)}</h3>
      <p><strong>Idol:</strong> ${esc(result.idol)} (Tie: ${esc(result.tie)})</p>
      <p>${calc.bonuses.map(b => `+${b.applied} ${esc(abilityName(b.ability))}`).join(", ") || "No ability bonuses"}${capped.length ? ` (capped at 24: ${capped.join(", ")})` : ""}.
      ${calc.tempHp} temporary hit points. Lasts ${calc.durationRounds} rounds.</p>
      <p><strong>Active:</strong> ${esc(result.active) || "none"} (spell level ${calc.activeLevel}, save DC ${calc.dc})</p>
      <p><strong>Passives:</strong> ${esc(result.passives) || "none"}</p>
      <p>When it ends: ${EXHAUSTION_AFTER} levels of exhaustion.</p>`
  });
  return effect;
}

/** End the Idolization and apply exhaustion. */
export async function endIdolization(actor) {
  const effect = activeIdolization(actor);
  if ( !effect ) return ui.notifications.info(`${actor.name} is not Idolized.`);
  await Promise.all(actor.effects.filter(e => e.getFlag(FLAG, "lastStand")).map(e => e.delete()));
  await effect.delete();
  const current = Number(actor.system.attributes.exhaustion ?? 0);
  const next = Math.min(6, current + EXHAUSTION_AFTER);
  await actor.update({ "system.attributes.exhaustion": next });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p>${esc(actor.name)}'s Idolization ends. Exhaustion ${current} to ${next}.</p>`
  });
}

/** Last Stand: drop to 1 hit point and take no damage until the start of the next turn. */
export async function lastStand(actor) {
  const effect = activeIdolization(actor);
  if ( !effect ) return ui.notifications.warn("Last Stand needs an active Idolization.");
  if ( effect.getFlag(FLAG, "lastStandUsed") ) return ui.notifications.warn("Last Stand is already spent for this Idolization.");
  const types = Object.keys(CONFIG.DND5E.damageTypes);
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "Last Stand", img: "icons/svg/shield.svg",
    changes: types.map(t => ({ key: "system.traits.di.value", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: t, priority: 20 })),
    duration: { value: 1, units: "rounds" },
    flags: { [FLAG]: { lastStand: true } }
  }]);
  await effect.setFlag(FLAG, "lastStandUsed", true);
  await actor.update({ "system.attributes.hp.value": 1 });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>${esc(actor.name)} makes a Last Stand.</strong> Down to 1 hit point, and no damage can touch them until the start of their next turn. Remove the Last Stand effect then.</p>`
  });
}

export function onRestCompleted(actor, result) {
  if ( result?.longRest ) actor.unsetFlag(FLAG, "idolizedSinceRest");
}
