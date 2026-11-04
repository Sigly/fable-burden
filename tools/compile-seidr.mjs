// Compiles scripts/data/seidr-spells-*.txt into scripts/data/seidr-spells.json
import fs from "node:fs";
import path from "node:path";
const dir = path.resolve(import.meta.dirname, "../scripts/data");
const files = fs.readdirSync(dir).filter(f => /^seidr-spells-[a-z]\.txt$/.test(f)).sort();
const NOT_SPELLS = new Set(["wild shape", "swords dance", "arcane gate script"]);
const creators = {}; const spells = []; const seen = new Map(); const dropped = [];
for ( const f of files ) {
  let cur = null;
  for ( const raw of fs.readFileSync(path.join(dir, f), "utf8").split("\n") ) {
    const line = raw.trim();
    if ( !line || line.startsWith("#") ) continue;
    if ( line.startsWith("@") ) {
      const [key, epithet, figure, stems] = line.slice(1).split("|").map(s => s.trim());
      creators[key] = { key, epithet, figure, stems: stems.split(";").map(s => s.trim()) };
      cur = key; continue;
    }
    const parts = line.split("|").map(s => s.trim());
    const [origs, name, request, fixed] = parts;
    const names = origs.split(";").map(s => s.trim()).filter(n => n && !/\(/.test(n));
    const original = names[0];
    if ( !original || NOT_SPELLS.has(original.toLowerCase()) ) { dropped.push(origs); continue; }
    const all = names.map(n => n.toLowerCase());
    if ( all.some(n => seen.has(n)) ) { dropped.push(`${origs} (duplicate of ${seen.get(all.find(n => seen.has(n)))})`); continue; }
    all.forEach(n => seen.set(n, original));
    spells.push({ original, aka: names.slice(1), name, creator: cur, request, fixed: fixed || null });
  }
}
// compose chants
const used = new Map(); // name -> original
const problems = [];
const perCreator = {};
for ( const s of spells ) {
  const c = creators[s.creator];
  const idx = (perCreator[s.creator] = (perCreator[s.creator] ?? -1) + 1);
  const stem = c.stems[idx % c.stems.length];
  s.chant = s.fixed ?? `${stem}, ${s.request}, ${s.name}.`;
  delete s.fixed; s.epithet = c.epithet;
  const k = s.name.toLowerCase();
  if ( used.has(k) ) problems.push(`Seidr name "${s.name}" used for both ${used.get(k)} and ${s.original}`);
  used.set(k, s.original);
  if ( k === s.original.toLowerCase() && !["firebolt"].includes(k) ) problems.push(`Name unchanged: ${s.name}`);
}
fs.writeFileSync(path.join(dir, "seidr-spells.json"), JSON.stringify({ creators: Object.values(creators), spells }, null, 1));
console.log(`creators ${Object.keys(creators).length}, spells ${spells.length}`);
console.log("dropped:", dropped.length); dropped.forEach(d => console.log("  -", d));
console.log("problems:", problems.length); problems.forEach(p => console.log("  !", p));
