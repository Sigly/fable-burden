/** The Trace tab on character and NPC sheets. */
import { MODULE_ID as FLAG } from "./burden-core.mjs";
import { ABILITIES, threkFor, seidrFor, saveDC, meginRating, epithetSlots, IDOLIZATION_FORMS } from "./core.mjs";
import { itemByKey, actorLevel, syncActor } from "./build.mjs";
import { actorBurden } from "./burden.mjs";
import { getRenown, setRenown, activeIdolization, idolize, endIdolization, lastStand } from "./idolize.mjs";
import { openAddDialog, openLibrary } from "./library.mjs";

const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");
const abilityLabel = k => CONFIG.DND5E.abilities[k]?.label ?? k.toUpperCase();

function abilitySelect(name, value, allowed) {
  return `<select data-trace-field="${name}">${allowed.map(a => `<option value="${a}" ${a === value ? "selected" : ""}>${esc(abilityLabel(a))}</option>`).join("")}</select>`;
}

function poolLeft(item) {
  if ( !item ) return null;
  const max = Number(item.system.uses?.max ?? 0);
  const spent = Number(item.system.uses?.spent ?? 0);
  return { left: Math.max(0, max - spent), max };
}

function usesText(item) {
  const max = Number(item.system?.uses?.max);
  if ( !Number.isFinite(max) || max <= 0 ) return "";
  const left = Math.max(0, max - Number(item.system.uses.spent ?? 0));
  return `${left}/${max}`;
}

function activationText(item) {
  const act = item.system?.activities?.contents?.[0] ?? item.system?.activities?.[0];
  const type = act?.activation?.type;
  return type ? (CONFIG.DND5E.activityActivationTypes?.[type]?.label ?? type) : "";
}

/** One ability row: use it, see its uses, open or remove it, expand its text. */
function abilityRow(item, canEdit) {
  const meta = [activationText(item), usesText(item)].filter(Boolean).join(" · ");
  return `<li class="trace-ability" data-trace-item="${item.id}">
    <details>
      <summary>
        <img src="${item.img}" width="20" height="20">
        <a data-trace-use="${item.id}" class="trace-item">${esc(item.name)}</a>
        <span class="trace-meta">${esc(meta)}</span>
        <span class="trace-ability-buttons">
          <a data-trace-open="${item.id}" title="Open"><i class="fa-solid fa-pen-to-square"></i></a>
          ${canEdit ? `<a data-trace-remove="${item.id}" title="Remove"><i class="fa-solid fa-trash"></i></a>` : ""}
        </span>
      </summary>
      <div class="trace-desc">${item.system?.description?.value ?? ""}</div>
    </details></li>`;
}

function abilityList(items, canEdit, empty) {
  return items.length ? `<ul class="trace-abilities">${items.map(i => abilityRow(i, canEdit)).join("")}</ul>` : `<p class="trace-muted">${empty}</p>`;
}

/** Build the HTML for the Trace tab of an actor. */
export function renderTraceHtml(actor) {
  const level = actorLevel(actor);
  const prof = actor.system.attributes?.prof ?? 2;
  const renown = getRenown(actor);
  const megin = meginRating(renown);
  const slots = epithetSlots(renown);
  const threkAbility = actor.getFlag(FLAG, "threkAbility") ?? "str";
  const seidrAbility = actor.getFlag(FLAG, "seidrAbility") ?? "int";
  const threk = threkFor(level);
  const seidr = seidrFor(level);
  const mod = a => actor.system.abilities?.[a]?.mod ?? 0;

  const threkPoolItem = itemByKey(actor, "threk-dice");
  const seidrPoolItem = itemByKey(actor, "seidr-points");
  const threkPool = poolLeft(threkPoolItem);
  const seidrPool = poolLeft(seidrPoolItem);
  const arts = actor.items.filter(i => i.getFlag(FLAG, "category") === "threk" && i.getFlag(FLAG, "key") !== "threk-dice");
  const seidrSpells = actor.items.filter(i => i.getFlag(FLAG, "seidrSpell"));
  const seidrListItem = itemByKey(actor, "seidr-list");
  const fables = actor.items.filter(i => i.getFlag(FLAG, "category") === "fable");
  const nid = actor.items.filter(i => i.getFlag(FLAG, "category") === "nid");
  const canEdit = actor.isOwner;
  const byCat = (cat, skipKeys = []) => actor.items.filter(i => i.getFlag(FLAG, "category") === cat && !skipKeys.includes(i.getFlag(FLAG, "key")));
  const megin_items = [...byCat("megin"), ...byCat("regin")];
  const idolItems = byCat("idolization");
  const itemLink = i => `<a data-trace-use="${i.id}" class="trace-item"><img src="${i.img}" width="18" height="18"> ${esc(i.name)}</a>`;

  let burden = "";
  try {
    const b = actorBurden(actor);
    burden = `<div class="trace-card"><h3>Burden <span class="trace-pill ${b.used > b.capacity ? "over" : ""}">${b.used} / ${b.capacity}</span></h3>
      <p class="trace-muted">${b.entries.length ? b.entries.map(e => `${esc(e.name)} (${e.burden})`).join(", ") : "Nothing carried."}</p></div>`;
  } catch(err) { burden = ""; }

  const idol = activeIdolization(actor);
  const idolButtons = Object.entries(IDOLIZATION_FORMS).map(([key, f]) =>
    `<button type="button" data-trace-idolize="${key}" ${megin < f.minMegin ? "disabled" : ""}>${f.label} <small>(Megin ${f.minMegin}+)</small></button>`).join("");

  return `<div class="trace-tab">
  <div class="trace-toolbar">
    <button type="button" data-trace-action="add"><i class="fa-solid fa-plus"></i> Add to this character</button>
    <button type="button" data-trace-action="library"><i class="fa-solid fa-book-open"></i> Trace Library</button>
    <button type="button" data-trace-action="sync"><i class="fa-solid fa-rotate"></i> Recalculate</button>
    ${game.user.isGM ? `<button type="button" data-trace-action="reveal"><i class="fa-solid ${actor.getFlag(FLAG, "traceShown") ? "fa-eye-slash" : "fa-eye"}"></i> ${actor.getFlag(FLAG, "traceShown") ? "Hide from player" : "Show to player"}</button>` : ""}
  </div>
  ${burden}
  <div class="trace-card"><h3>Renown and Megin</h3>
    <div class="trace-row"><label>Renown (0 to 100)</label><input type="number" min="0" max="100" step="1" value="${renown}" data-trace-field="renown"></div>
    <p>Megin rating <strong>${megin}</strong> (Renown ÷ 10, max 10).
    Epithet: ${slots ? `<em>${slots} passive${slots > 1 ? "s" : ""} allowed</em>` : "<em>locked until 20 Renown</em>"}</p>
    ${slots ? `<div class="trace-row"><label>Epithet</label><input type="text" data-trace-field="epithet" value="${esc(actor.getFlag(FLAG, "epithet") ?? "")}"></div>` : ""}
  </div>
  <div class="trace-card"><h3>Megin and Regin</h3>
    ${abilityList(megin_items, canEdit, "None yet.")}
  </div>
  <div class="trace-card"><h3>Þrek <span class="trace-pill">${threkPool ? `${threkPool.left} / ${threkPool.max} dice` : "not added"}</span></h3>
    <div class="trace-row"><label>Þrek modifier</label>${abilitySelect("threkAbility", threkAbility, ["str", "dex", "con"])}</div>
    <p>Level ${level}: ${threk.dice}d${threk.die}, ${threk.arts} Arts known. Art save DC <strong>${saveDC(prof, mod(threkAbility))}</strong>.
    ${arts.length > threk.arts ? `<span class="trace-warn">You have ${arts.length} Arts but know ${threk.arts}.</span>` : ""}</p>
    ${threkPoolItem ? abilityList([threkPoolItem], canEdit, "") : ""}
    ${abilityList(arts, canEdit, "No Arts yet.")}
  </div>
  <div class="trace-card"><h3>Seiðr <span class="trace-pill">${seidrPool ? `${seidrPool.left} / ${seidrPool.max} points` : "not added"}</span></h3>
    <div class="trace-row"><label>Seiðr ability</label>${abilitySelect("seidrAbility", seidrAbility, ["int", "wis", "cha"])}</div>
    <p>Seiðr level ${seidr.seidrLevel}, up to spell level ${seidr.maxSpellLevel}, ${seidr.cantrips} cantrips, ${seidr.spellsKnown} spells. Save DC <strong>${saveDC(prof, mod(seidrAbility))}</strong>, attack <strong>+${prof + mod(seidrAbility)}</strong>.</p>
    ${abilityList([seidrPoolItem, seidrListItem].filter(Boolean), canEdit, "")}
    ${abilityList([...seidrSpells].sort((a, b) => (a.getFlag(FLAG, "spellLevel") ?? 0) - (b.getFlag(FLAG, "spellLevel") ?? 0)), canEdit, "No Seiðr spells yet.")}
  </div>
  <div class="trace-card"><h3>Idolization ${idol ? `<span class="trace-pill">${esc(idol.name)}</span>` : ""}</h3>
    ${idol ? `<p>${idol.description ?? ""}</p>
      <div class="trace-toolbar"><button type="button" data-trace-action="laststand" ${idol.getFlag(FLAG, "lastStandUsed") ? "disabled" : ""}>Last Stand</button>
      <button type="button" data-trace-action="endidol">End Idolization (3 exhaustion)</button></div>`
    : `<p class="trace-muted">${actor.getFlag(FLAG, "idolizedSinceRest") ? "Already Idolized since the last long rest." : "Once per long rest. Needs a Tie to the Idol."}</p>
      <div class="trace-toolbar">${idolButtons}</div>`}
    ${abilityList(idolItems, canEdit, "")}
  </div>
  <div class="trace-card"><h3>Fables</h3>
    <p class="trace-list">${fables.map(i => `${itemLink(i)} <small>(${esc(i.getFlag(FLAG, "tier"))}, Burden ${i.getFlag(FLAG, "burden")})</small>`).join("<br>") || '<span class="trace-muted">No Fables.</span>'}</p>
  </div>
  <div class="trace-card"><h3>Níð and Æði</h3>
    ${abilityList(nid, canEdit, "None.")}
  </div>
</div>`;
}

/** Wire up clicks and field changes inside a rendered sheet. */
export function activateTrace(app, element, actor) {
  const root = element.querySelector(".trace-tab");
  if ( !root || root.dataset.wired ) return;
  root.dataset.wired = "1";
  const editable = actor.isOwner;

  root.addEventListener("click", async event => {
    const use = event.target.closest("[data-trace-use]");
    if ( use ) { event.preventDefault(); event.stopPropagation(); return actor.items.get(use.dataset.traceUse)?.use?.({ event }); }
    const open = event.target.closest("[data-trace-open]");
    if ( open ) { event.preventDefault(); return actor.items.get(open.dataset.traceOpen)?.sheet.render(true); }
    const remove = event.target.closest("[data-trace-remove]");
    if ( remove && editable ) {
      event.preventDefault();
      const item = actor.items.get(remove.dataset.traceRemove);
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Remove" }, content: `<p>Remove ${esc(item?.name)} from ${esc(actor.name)}?</p>` });
      return ok ? item?.delete() : null;
    }
    const idolBtn = event.target.closest("[data-trace-idolize]");
    if ( idolBtn && editable ) return idolize(actor, idolBtn.dataset.traceIdolize);
    const btn = event.target.closest("[data-trace-action]");
    if ( !btn || !editable ) return;
    switch ( btn.dataset.traceAction ) {
      case "add": return openAddDialog(actor);
      case "library": return openLibrary(actor);
      case "reveal": {
        const shown = !actor.getFlag(FLAG, "traceShown");
        await actor.setFlag(FLAG, "traceShown", shown);
        return ui.notifications.info(shown ? `Trace is now visible to ${actor.name}'s owners.` : `Trace is hidden from ${actor.name}'s owners.`);
      }
      case "sync": await syncActor(actor); return ui.notifications.info("Trace values recalculated.");
      case "laststand": return lastStand(actor);
      case "endidol": return endIdolization(actor);
    }
  });

  root.addEventListener("change", async event => {
    const field = event.target.closest("[data-trace-field]");
    if ( !field || !editable ) return;
    const name = field.dataset.traceField;
    if ( name === "renown" ) await setRenown(actor, field.value);
    else if ( name === "epithet" ) await actor.setFlag(FLAG, "epithet", field.value);
    else { await actor.setFlag(FLAG, name, field.value); await syncActor(actor); }
  });
}
