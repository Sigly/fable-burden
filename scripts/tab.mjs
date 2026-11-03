/** The Trace tab on character and NPC sheets. */
import { MODULE_ID as FLAG } from "./burden-core.mjs";
import { SECTIONS, sectionShown, toggleSection } from "./reveal.mjs";
import { ABILITIES, threkFor, seidrFor, saveDC, meginRating, epithetSlots, IDOLIZATION_FORMS } from "./core.mjs";
import { itemByKey, actorLevel, syncActor, addDroppedSpell } from "./build.mjs";
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

/** Progress bar for Renown. Ticks mark each Megin rating (every 10) and the Epithet thresholds (20, 50, 80). */
function renownBar(renown) {
  const megin = meginRating(renown);
  const toNext = megin >= 10 ? 0 : (megin + 1) * 10 - renown;
  const within = megin >= 10 ? 100 : (renown - megin * 10) * 10;   // percent of the way to the next Megin rating
  const ticks = [10, 20, 30, 40, 50, 60, 70, 80, 90].map(n => `<i class="tick ${[20, 50, 80].includes(n) ? "epithet" : ""}" style="left:${n}%"></i>`).join("");
  return `<div class="trace-bar" title="Renown ${renown} / 100">
      <div class="trace-bar-fill" style="width:${renown}%"></div>${ticks}
      <span class="trace-bar-label">Renown ${renown} / 100</span>
    </div>
    <div class="trace-bar trace-bar-small" title="Progress to the next Megin rating">
      <div class="trace-bar-fill megin" style="width:${within}%"></div>
      <span class="trace-bar-label">${megin >= 10 ? "Megin rating 10 (maximum)" : `Megin ${megin}, ${toNext} Renown to Megin ${megin + 1}`}</span>
    </div>`;
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

  let burden = null;
  try {
    const b = actorBurden(actor);
    burden = { title: `Burden <span class="trace-pill ${b.used > b.capacity ? "over" : ""}">${b.used} / ${b.capacity}</span>`,
      body: `<p class="trace-muted">${b.entries.length ? b.entries.map(e => `${esc(e.name)} (${e.burden})`).join(", ") : "Nothing carried."}</p>` };
  } catch(err) { burden = null; }

  const idol = activeIdolization(actor);
  const idolButtons = Object.entries(IDOLIZATION_FORMS).map(([key, f]) =>
    `<button type="button" data-trace-idolize="${key}" ${megin < f.minMegin ? "disabled" : ""}>${f.label} <small>(Megin ${f.minMegin}+)</small></button>`).join("");

  const gm = game.user.isGM;
  const shownMap = actor.getFlag(FLAG, "sections") ?? {};
  const card = (sec, titleHtml, body) => {
    if ( !sectionShown(actor, sec) ) return "";
    const on = !!shownMap[sec];
    const eye = gm && game.settings.get(FLAG, "gmOnly")
      ? `<button type="button" class="trace-eye ${on ? "on" : ""}" data-trace-action="reveal-section" data-section="${sec}" data-tooltip="${on ? "Shown to players. Click to hide." : "Hidden from players. Click to show."}"><i class="fa-solid ${on ? "fa-eye" : "fa-eye-slash"}"></i> ${on ? "Shown" : "Show to player"}</button>` : "";
    return `<div class="trace-card" data-section="${sec}"><h3>${titleHtml}${eye}</h3>${body}</div>`;
  };
  const tools = gm || !game.settings.get(FLAG, "gmOnly");
  const cards = [
    burden ? card("burden", burden.title, burden.body) : "",
    card("renown", "Renown and Megin", `${renownBar(renown)}
    <div class="trace-row"><label>Renown (0 to 100)</label><input type="number" min="0" max="100" step="1" value="${renown}" data-trace-field="renown"></div>
    <p>Megin rating <strong>${megin}</strong> (Renown ÷ 10, max 10).
    Epithet: ${slots ? `<em>${slots} passive${slots > 1 ? "s" : ""} allowed</em>` : "<em>locked until 20 Renown</em>"}</p>
    ${slots ? `<div class="trace-row"><label>Epithet</label><input type="text" data-trace-field="epithet" value="${esc(actor.getFlag(FLAG, "epithet") ?? "")}"></div>` : ""}`),
    card("megin", "Megin and Regin", abilityList(megin_items, canEdit, "None yet.")),
    card("threk", `Þrek <span class="trace-pill">${threkPool ? `${threkPool.left} / ${threkPool.max} dice` : "not added"}</span>`, `
    <div class="trace-row"><label>Þrek modifier</label>${abilitySelect("threkAbility", threkAbility, ["str", "dex", "con"])}</div>
    <p>Level ${level}: ${threk.dice}d${threk.die}, ${threk.arts} Arts known. Art save DC <strong>${saveDC(prof, mod(threkAbility))}</strong>.
    ${arts.length > threk.arts ? `<span class="trace-warn">You have ${arts.length} Arts but know ${threk.arts}.</span>` : ""}</p>
    ${threkPoolItem ? abilityList([threkPoolItem], canEdit, "") : ""}
    ${abilityList(arts, canEdit, "No Arts yet.")}`),
    card("seidr", `Seiðr <span class="trace-pill">${seidrPool ? `${seidrPool.left} / ${seidrPool.max} points` : "not added"}</span>`, `
    <div class="trace-row"><label>Seiðr ability</label>${abilitySelect("seidrAbility", seidrAbility, ["int", "wis", "cha"])}</div>
    <p>Seiðr level ${seidr.seidrLevel}, up to spell level ${seidr.maxSpellLevel}, ${seidr.cantrips} cantrips, ${seidr.spellsKnown} spells. Save DC <strong>${saveDC(prof, mod(seidrAbility))}</strong>, attack <strong>+${prof + mod(seidrAbility)}</strong>.</p>
    ${abilityList([seidrPoolItem, seidrListItem].filter(Boolean), canEdit, "")}
    ${canEdit ? `<div class="trace-drop" data-trace-drop="seidr"><i class="fa-solid fa-arrow-down"></i> Drag a spell here to make it a Seiðr spell</div>` : ""}
    ${abilityList([...seidrSpells].sort((a, b) => (a.getFlag(FLAG, "spellLevel") ?? 0) - (b.getFlag(FLAG, "spellLevel") ?? 0)), canEdit, "No Seiðr spells yet.")}`),
    card("idolization", `Idolization ${idol ? `<span class="trace-pill">${esc(idol.name)}</span>` : ""}`, `
    ${idol ? `<p>${idol.description ?? ""}</p>
      <div class="trace-toolbar"><button type="button" data-trace-action="laststand" ${idol.getFlag(FLAG, "lastStandUsed") ? "disabled" : ""}>Last Stand</button>
      <button type="button" data-trace-action="endidol">End Idolization (3 exhaustion)</button></div>`
    : `<p class="trace-muted">${actor.getFlag(FLAG, "idolizedSinceRest") ? "Already Idolized since the last long rest." : "Once per long rest. Needs a Tie to the Idol."}</p>
      <div class="trace-toolbar">${idolButtons}</div>`}
    ${abilityList(idolItems, canEdit, "")}`),
    card("fables", "Fables", `<p class="trace-list">${fables.map(i => `${itemLink(i)} <small>(${esc(i.getFlag(FLAG, "tier"))}, Burden ${i.getFlag(FLAG, "burden")})</small>`).join("<br>") || '<span class="trace-muted">No Fables.</span>'}</p>`),
    card("nid", "Níð and Æði", abilityList(nid, canEdit, "None."))
  ].join("");
  return `<div class="trace-tab">
  ${tools ? `<div class="trace-toolbar">
    <button type="button" data-trace-action="add"><i class="fa-solid fa-plus"></i> Add to this character</button>
    <button type="button" data-trace-action="library"><i class="fa-solid fa-book-open"></i> Trace Library</button>
    <button type="button" data-trace-action="sync"><i class="fa-solid fa-rotate"></i> Recalculate</button>
  </div>` : ""}
  ${cards}
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
      case "reveal-section": {
        if ( !game.user.isGM ) return;
        const sec = btn.dataset.section;
        const shown = await toggleSection(actor, sec);
        return ui.notifications.info(`${SECTIONS[sec]} is ${shown ? "now visible to" : "hidden from"} ${actor.name}'s owners.`);
      }
      case "sync": await syncActor(actor); return ui.notifications.info("Trace values recalculated.");
      case "laststand": return lastStand(actor);
      case "endidol": return endIdolization(actor);
    }
  });

  // Drag and drop: any spell dropped on the Seiðr box becomes a Seiðr spell paid for with Seiðr Points.
  const zone = root.querySelector("[data-trace-drop=seidr]");
  if ( zone && editable ) {
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", async e => {
      e.preventDefault(); e.stopPropagation(); zone.classList.remove("over");
      const reader = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor?.implementation ?? globalThis.TextEditor;
      const data = reader.getDragEventData(e);
      if ( data?.type !== "Item" ) return ui.notifications.warn("Drop a spell here.");
      const doc = data.uuid ? await fromUuid(data.uuid) : null;
      const created = await addDroppedSpell(actor, doc);
      if ( created ) ui.notifications.info(`${created.name} is now a Seiðr spell for ${actor.name}.`);
    });
  }

  root.addEventListener("change", async event => {
    const field = event.target.closest("[data-trace-field]");
    if ( !field || !editable ) return;
    const name = field.dataset.traceField;
    if ( name === "renown" ) await setRenown(actor, field.value);
    else if ( name === "epithet" ) await actor.setFlag(FLAG, "epithet", field.value);
    else { await actor.setFlag(FLAG, name, field.value); await syncActor(actor); }
  });
}
