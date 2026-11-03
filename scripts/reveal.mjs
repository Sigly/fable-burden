/** Per-section visibility of the Trace tab. GMs see everything; players see only sections the GM revealed. */
const ID = "trace-5e";

export const SECTIONS = {
  burden: "Burden",
  renown: "Renown and Megin",
  megin: "Megin and Regin",
  threk: "Þrek",
  seidr: "Seiðr",
  idolization: "Idolization",
  fables: "Fables",
  nid: "Níð and Æði"
};

/** Which section an item belongs to. */
export function sectionOf(item) {
  if ( item.getFlag(ID, "seidrSpell") ) return "seidr";
  const cat = item.getFlag(ID, "category");
  return { megin: "megin", regin: "megin", threk: "threk", seidr: "seidr", idolization: "idolization", fable: "fables", nid: "nid" }[cat] ?? null;
}

const gmOnly = () => game.settings.get(ID, "gmOnly");

export function sectionShown(actor, section) {
  if ( game.user.isGM || !gmOnly() ) return true;
  return !!actor?.getFlag(ID, "sections")?.[section];
}

/** The tab appears for a player when at least one section is revealed. */
export function anySectionShown(actor) {
  if ( game.user.isGM || !gmOnly() ) return true;
  return Object.values(actor?.getFlag(ID, "sections") ?? {}).some(Boolean);
}

export async function toggleSection(actor, section) {
  const shown = !actor.getFlag(ID, "sections")?.[section];
  await actor.setFlag(ID, "sections", { [section]: shown });
  return shown;
}
