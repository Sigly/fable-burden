/**
 * Trace rules as item definitions. Pure data, no Foundry globals.
 * Activity descriptor: { name, kind: "utility"|"save", activation, save, roll, spend }
 *   spend: "threk" spends one Þrek die from the Þrek Dice feature.
 *   roll.formula may contain {die}, which is filled with the actor's Þrek die.
 * Save DCs are filled by the builder from the actor's chosen Þrek / Seiðr ability.
 */

export const CATEGORIES = [
  { id: "burden", label: "Fable Burden" },
  { id: "megin", label: "Megin" },
  { id: "regin", label: "Regin" },
  { id: "seidr", label: "Seiðr" },
  { id: "threk", label: "Þrek" },
  { id: "idolization", label: "Idolization" },
  { id: "nid", label: "Níð and Æði" },
  { id: "fable", label: "Fables" }
];

const p = text => `<p>${text}</p>`;
const ul = items => `<ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;

export const THREK_ARTS = [
  { name: "Surge Strike", when: "You hit with a weapon attack or unarmed strike", effect: "Add the die to the damage.", activation: "special" },
  { name: "Reaching Wave", when: "You make a melee weapon attack", effect: "Your reach is 10 feet greater for that attack. On a hit, add the die as force damage.", activation: "special" },
  { name: "Low Sweep", when: "You hit with a melee weapon attack", effect: "Add the die to the damage. A Large or smaller target makes a Strength save or is knocked prone.", activation: "special", save: "str" },
  { name: "Hammer Blow", when: "You hit with a weapon attack", effect: "Add the die to the damage. A Large or smaller target makes a Strength save or is pushed up to 15 feet away.", activation: "special", save: "str" },
  { name: "Stagger", when: "You hit with a weapon attack", effect: "Add the die to the damage. The target makes a Constitution save or can't take reactions until the start of your next turn.", activation: "special", save: "con" },
  { name: "Goad", when: "You hit with a weapon attack", effect: "Add the die to the damage. The target makes a Wisdom save or has disadvantage on attacks against anyone but you until the end of your next turn.", activation: "special", save: "wis" },
  { name: "Sweeping Arc", when: "You hit with a melee weapon attack", effect: "Choose a second creature within 5 feet of the target and within your reach. If the attack roll would hit it, it takes damage equal to the die roll, of the weapon's damage type.", activation: "special" },
  { name: "Steady Sight", when: "You make a weapon attack roll", effect: "Add the die to the roll. You can wait until after you see the roll, but before you know whether it hits.", activation: "special" },
  { name: "Echoing Reply", when: "A creature misses you with a melee attack", effect: "Use your reaction to make one melee weapon attack against it. On a hit, add the die to the damage.", activation: "reaction" },
  { name: "Stone Skin", when: "A creature hits you with an attack", effect: "Use your reaction. Reduce the damage by the die roll plus your Constitution modifier.", activation: "reaction", formula: "{die} + @abilities.con.mod" },
  { name: "Gale Step", when: "You move on your turn", effect: "Add the die roll to your AC until you stop moving, and ignore difficult terrain during that movement.", activation: "special" },
  { name: "Rallying Chant", when: "As a bonus action", effect: "A friendly creature within 30 feet that can see or hear you gains temporary hit points equal to the die roll plus your proficiency bonus.", activation: "bonus", formula: "{die} + @prof" }
];

const artItems = THREK_ARTS.map(a => ({
  key: `threk-${a.name.toLowerCase().replace(/\W+/g, "-")}`,
  category: "threk",
  name: a.name,
  img: "icons/svg/combat.svg",
  desc: p(`<strong>Use it when:</strong> ${a.when}.`) + p(`<strong>Effect:</strong> ${a.effect}`)
    + p("Spend one Þrek die. At most one Art per attack or trigger. Needs a short chant and a trained movement. Damage and effects count as Megin.")
    + (a.save ? p(`The save DC is 8 + proficiency bonus + your Þrek modifier. Trace fills this in.`) : ""),
  activities: [{
    name: a.name, kind: a.save ? "save" : "utility", activation: a.activation, save: a.save ?? null,
    roll: { name: "Þrek die", formula: a.formula ?? "{die}" }, spend: "threk"
  }]
}));

export const POWERS = [
  /* ---------- Megin ---------- */
  {
    key: "megin", category: "megin", name: "Megin", img: "icons/svg/aura.svg",
    desc: p("<strong>Megin</strong> is the energy that stories give the people who are told. Your Fables, Regin, Seiðr, Þrek and Idolization all run on it.")
      + ul([
        "Damage and effects from Megin ignore resistance to nonmagical damage, including the Lost's resistance to ordinary weapons.",
        "Your <strong>Megin rating</strong> is your Renown divided by 10, rounded down, to a maximum of 10. It gates Idolization and sets how long it lasts.",
        "Seiðr and Þrek effects count as Megin. Regin lets your weapon hits count as Megin too."
      ]),
    activities: []
  },
  {
    key: "megin-rating", category: "megin", name: "Renown and Megin Rating", img: "icons/svg/angel.svg",
    desc: p("Renown is a number from 0 to 100. It exists to raise your Megin rating and to unlock your Epithet, and does nothing else.")
      + ul([
        "A deed gains 1, 2, 3 or 5 Renown depending on its size. The wider your fame, the more a deed is worth. Bad deeds count the same as good ones.",
        "You can never gain more than 6 Renown in one session.",
        "You lose 1 Renown for each season in which nobody tells your story.",
        "Megin rating = floor(Renown / 10), up to 10."
      ]) + p("Track Renown on the Trace tab of your character sheet."),
    activities: []
  },

  /* ---------- Regin ---------- */
  {
    key: "regin-infusion", category: "regin", name: "Regin: Infusion", img: "icons/svg/sword.svg",
    desc: p("Regin is Megin held in your gear. It removes the Lost's resistance to normal weapons and adds no damage of its own.")
      + p("<strong>Infusion.</strong> As a bonus action, infuse one weapon or object you are holding or wearing, or your fists. For 1 minute, attacks made with it count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage. Any object works as an improvised weapon, and ammunition fired from an infused ranged weapon counts as infused.")
      + ul([
        "You can keep two things infused at once, and your fists count as one. Infusing a third ends the oldest infusion.",
        "An infusion ends when the item leaves your hands or body. A thrown object stays infused until the end of that turn.",
        "It doesn't scale with level and adds no bonus to attack or damage."
      ]),
    activities: [{ name: "Infuse", kind: "utility", activation: "bonus" }],
    duration: { value: "1", units: "minute" }
  },

  /* ---------- Þrek ---------- */
  {
    key: "threk-dice", category: "threk", name: "Þrek Dice", img: "icons/svg/d20-grey.svg", pool: "threk",
    desc: p("Þrek is Megin pushed past the human limit through a chant and a trained movement. It plays like superiority dice: a small pool of dice spent on Arts.")
      + ul([
        "Spend one die per Art, and use at most one Art per attack or trigger.",
        "You regain all spent dice when you finish a short or long rest.",
        "Arts stack with class features, so a Battle Master can use a maneuver and an Art on the same attack.",
        "When you gain Þrek, choose Strength, Dexterity or Constitution. That is your Þrek modifier. An Art's save DC is 8 + proficiency bonus + your Þrek modifier.",
        "Each time you gain a level you can swap one Art you know for another.",
        "<strong>Rekindle (15th level).</strong> When you roll initiative and have no Þrek dice left, you regain one."
      ])
      + `<table><thead><tr><th>Level</th><th>Dice</th><th>Die</th><th>Arts known</th></tr></thead><tbody>`
      + [["1st", 2, "d6", 2], ["3rd", 3, "d6", 3], ["5th", 3, "d8", 3], ["7th", 4, "d8", 4], ["10th", 4, "d10", 5], ["15th", 5, "d10", 6], ["18th", 5, "d12", 6]]
        .map(r => `<tr><td>${r.join("</td><td>")}</td></tr>`).join("") + `</tbody></table>`,
    activities: []
  },
  ...artItems,

  /* ---------- Seiðr ---------- */
  {
    key: "seidr-points", category: "seidr", name: "Seiðr Points", img: "icons/svg/lightning.svg", pool: "seidr",
    desc: p("Seiðr is Megin pushed out through a chant and a pose as an elemental or physical spell. It is a small, separate pool of spellcasting, built on the DMG spell points variant and paced like an Eldritch Knight.")
      + ul([
        "Your Seiðr level is one third of your character level, rounded up. The points come from the table in this feature's sheet.",
        "Choose Intelligence, Wisdom or Charisma as your Seiðr spellcasting ability. Save DC = 8 + proficiency bonus + that modifier. Spell attack bonus = proficiency bonus + that modifier.",
        "You know 2 cantrips (3 from 10th level) and a number of spells equal to your Seiðr level + 2.",
        "Casting a spell costs the points for its level. Cantrips are free. You can upcast by paying the higher level's cost, up to your highest Seiðr spell level.",
        "Seiðr spells never use spell slots, and slots never pay for Seiðr spells. Arcane Recovery and Natural Recovery don't restore Seiðr Points.",
        "You regain all spent Seiðr Points when you finish a long rest."
      ])
      + `<table><thead><tr><th>Spell level</th>${[1,2,3,4,5,6,7,8,9].map(n => `<th>${n}</th>`).join("")}</tr></thead><tbody><tr><td>Point cost</td>${[2,3,5,6,7,9,10,11,13].map(n => `<td>${n}</td>`).join("")}</tr></tbody></table>`,
    activities: []
  },
  {
    key: "seidr-list", category: "seidr", name: "Seiðr Spell List", img: "icons/svg/fire.svg",
    desc: ul([
      "Cantrips: Fire Bolt, Frostbite, Ray of Frost, Shocking Grasp, Thunderclap.",
      "1st: Absorb Elements, Burning Hands, Ice Knife, Shield, Thunderwave.",
      "2nd: Flame Blade, Gust of Wind, Levitate, Scorching Ray, Shatter.",
      "3rd: Fireball, Lightning Bolt, Sleet Storm, Wind Wall.",
      "4th: Fire Shield, Ice Storm, Stoneskin, Wall of Fire."
    ]) + p("Use the Seiðr spells button on the Trace tab to add the spells you choose. They are paid for with Seiðr Points."),
    activities: []
  },

  /* ---------- Idolization ---------- */
  {
    key: "epithet", category: "idolization", name: "Epithet", img: "icons/svg/book.svg",
    desc: p("At 20 Renown the world gives you an Epithet. It grants <strong>passive abilities only</strong>: 1 at 20 Renown, 2 at 50, 3 at 80. If your Renown falls below 20 you lose it.")
      + p("Write your Epithet and its passive abilities here.") + "<p><em>Epithet: </em></p>",
    activities: []
  },
  {
    key: "idolization-tie", category: "idolization", name: "Idolization: Ties and Rules", img: "icons/svg/daze.svg",
    desc: p("Idolization is borrowing power from the Idol whose story is behind your Fable. You may Idolize <strong>once per long rest</strong>.")
      + ul([
        "<strong>A Tie.</strong> You need a Tie to the Idol: a relic, kin, a deed or an oath.",
        "<strong>A Megin rating</strong> high enough for the form: Maxim 2, Partial Idolization 5, Ascension 8.",
        "<strong>Duration:</strong> 2 rounds per point of Megin rating.",
        "<strong>Ability cap:</strong> Idolization can never push an ability score above 24.",
        "<strong>Exhaustion:</strong> when it ends you gain 3 levels of exhaustion, in every form.",
        "<strong>The active:</strong> you get one active ability, if any, equal to a spell of a level equal to your proficiency bonus (max 5th). Its save DC is 8 + proficiency bonus + Seiðr modifier.",
        "<strong>Passive upgrades</strong> are decided by the individual Idol.",
        "<strong>Last Stand.</strong> Once per Idolization, when you would drop, you instead drop to 1 hit point and can't take any damage until the start of your next turn."
      ]),
    activities: []
  },
  {
    key: "idolization-maxim", category: "idolization", name: "Idolization: Maxim", img: "icons/svg/upgrade.svg",
    desc: p("Idolization of the Fable. Megin rating 2 or higher. You must bear a Rare or higher Fable of the Idol.")
      + ul([
        "+2 to one ability score (max 24).",
        "Temporary hit points equal to 5 × your proficiency bonus.",
        "Active: the Fable's Maxim.",
        "1 passive upgrade."
      ]) + p("Start it from the Idolize button on the Trace tab."),
    activities: [{ name: "Idolize: Maxim", kind: "utility", activation: "bonus" }]
  },
  {
    key: "idolization-partial", category: "idolization", name: "Idolization: Partial Idolization", img: "icons/svg/upgrade.svg",
    desc: p("You take the form of the Idol. Megin rating 5 or higher.")
      + ul([
        "+2 to two different ability scores (max 24).",
        "Temporary hit points equal to 10 × your proficiency bonus.",
        "Active: the Idol's signature act.",
        "Up to 2 passive upgrades."
      ]) + p("Start it from the Idolize button on the Trace tab."),
    activities: [{ name: "Idolize: Partial", kind: "utility", activation: "bonus" }]
  },
  {
    key: "idolization-ascension", category: "idolization", name: "Idolization: Ascension", img: "icons/svg/upgrade.svg",
    desc: p("The Idol is possessing your body. Megin rating 8 or higher.")
      + ul([
        "+4 to one ability score and +2 to two others (max 24).",
        "Temporary hit points equal to 15 × your proficiency bonus.",
        "Active: the Idol's signature act.",
        "Up to 3 passive upgrades."
      ]) + p("Start it from the Idolize button on the Trace tab."),
    activities: [{ name: "Idolize: Ascension", kind: "utility", activation: "bonus" }]
  },
  {
    key: "idolization-last-stand", category: "idolization", name: "Last Stand", img: "icons/svg/shield.svg",
    desc: p("Once per Idolization. When you would drop to 0 hit points, you instead drop to 1 hit point and can't take any damage until the start of your next turn."),
    activities: [{ name: "Last Stand", kind: "utility", activation: "special" }]
  },

  /* ---------- Níð and Æði ---------- */
  {
    key: "aedi", category: "nid", name: "Æði", img: "icons/svg/skull.svg",
    desc: p("Æði is the family of abilities the Lost perform with Níð. They are biological, not learned. Specific Æði such as Rati, Klofna and Staðna are performed by most Lost. Æði takes a physical form only, though it can be stretched to sound or wind.")
      + p("<em>The mechanics of the Níð powers below are first drafts from the module author. Adjust them to your table.</em>"),
    activities: []
  },
  {
    key: "rati", category: "nid", name: "Rati", img: "icons/svg/explosion.svg",
    desc: p("Condense Níð into a dense mass and launch it with immense force. Ranged, 60 feet. The target makes a Dexterity save (DC 8 + proficiency + Constitution modifier) or takes (proficiency bonus + 1)d8 bludgeoning damage, half on a save. The damage counts as Níð, not Megin."),
    activities: [{ name: "Rati", kind: "save", activation: "action", save: "dex", roll: { name: "Damage", formula: "(@prof + 1)d8" } }]
  },
  {
    key: "orkan-rati", category: "nid", name: "Orkan Rati", img: "icons/svg/explosion.svg",
    desc: p("An empowered Rati. A 60-foot line, 10 feet wide. Each creature in it makes a Dexterity save (DC 8 + proficiency + Constitution modifier), taking (proficiency bonus + 3)d8 bludgeoning damage, half on a save. Once per short rest."),
    activities: [{ name: "Orkan Rati", kind: "save", activation: "action", save: "dex", roll: { name: "Damage", formula: "(@prof + 3)d8" } }],
    uses: { max: 1, recovery: "sr" }
  },
  {
    key: "orkan-puris", category: "nid", name: "Orkan Puris", img: "icons/svg/sun.svg",
    desc: p("A burst of Níð pushed out of the whole body. Each creature within 15 feet makes a Strength save (DC 8 + proficiency + Constitution modifier), taking (proficiency bonus + 2)d8 force damage and being pushed 15 feet away on a failed save, half damage and not pushed on a success. Once per short rest."),
    activities: [{ name: "Orkan Puris", kind: "save", activation: "action", save: "str", roll: { name: "Damage", formula: "(@prof + 2)d8" } }],
    uses: { max: 1, recovery: "sr" }
  },
  {
    key: "klofna", category: "nid", name: "Klofna", img: "icons/svg/ice-aura.svg",
    desc: p("Separate consumed souls into other physical Níð forms. As an action, split a piece of yourself into a number of lesser Lost equal to your proficiency bonus (use the Hverfa stat block). They act on your initiative. Larger and older Lost make waves with this. You lose hit points equal to 5 × the number created. Once per long rest."),
    activities: [{ name: "Klofna", kind: "utility", activation: "action" }],
    uses: { max: 1, recovery: "lr" }
  },
  {
    key: "stadna", category: "nid", name: "Staðna", img: "icons/svg/padlock.svg",
    desc: p("Put Megin into stasis, held on the precipice between Megin and Níð, removing that energy from a fight. A creature you can touch or hit with Rati makes a Constitution save (DC 8 + proficiency + Constitution modifier). On a failure, it can't spend Megin resources (Seiðr Points, Þrek dice or Fable powers) for 1 minute. It repeats the save at the end of each of its turns."),
    activities: [{ name: "Staðna", kind: "save", activation: "action", save: "con" }]
  },
  {
    key: "spjolling", category: "nid", name: "Spjölling", img: "icons/svg/regen.svg",
    desc: p("Convert Megin into Níð. As a bonus action, spend up to your proficiency bonus in Þrek dice or Seiðr level 1 points, and regain hit points equal to what you spent × 2d6. Used by the Lost as a healing ability."),
    activities: [{ name: "Spjölling", kind: "utility", activation: "bonus" }]
  },
  {
    key: "haugr", category: "nid", name: "Haugr", img: "icons/svg/castle.svg",
    desc: p("The Draugr's famous use of Níð: coating a territory. As a minute-long ritual, mark an area up to 120 feet across. You know when any creature enters it, and you have advantage on attack rolls and saving throws inside it. It lasts until you leave it for a day."),
    activities: [{ name: "Haugr", kind: "utility", activation: "special" }]
  },
  {
    key: "getnadr", category: "nid", name: "Getnaðr", img: "icons/svg/mountain.svg",
    desc: p("The Jötunn's signature: split a piece of yourself into a living creature, permanently giving up Níð. Your maximum hit points drop by 20. The creature is under your complete control. It uses a stat block of your choice of CR up to a quarter of your own."),
    activities: [{ name: "Getnaðr", kind: "utility", activation: "action" }]
  },
  {
    key: "leiftr", category: "nid", name: "Leiftr", img: "icons/svg/lightning.svg",
    desc: p("A party ability. When you hit a creature with an attack, you can unleash a flash of Megin through the strike. Add (proficiency bonus)d10 force damage to the hit, and the damage counts as Megin. If the hit is a critical hit, roll the dice twice. Once per short rest."),
    activities: [{ name: "Leiftr", kind: "utility", activation: "special", roll: { name: "Force damage", formula: "(@prof)d10" } }],
    uses: { max: 1, recovery: "sr" }
  }
];

/** Items for a category, in order. */
export const powersFor = category => POWERS.filter(p => p.category === category);

/** Items Trace gives to every character that picks "Add everything". */
export const CORE_KEYS = POWERS.filter(p => ["megin", "regin", "threk", "seidr", "idolization"].includes(p.category)).map(p => p.key);
