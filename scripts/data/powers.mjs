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

const ICON_THREK = "icons/magic/symbols/rune-sigil-black-pink.webp";
export const ICON_SEIDR = "icons/magic/symbols/arrowhead-green.webp";

/**
 * The Þrek Arts (The Play, Enhance, Willful, then the weapon styles). style groups them; role is Opener, Builder or Finisher. kind: die (rolls the die), save (optional damage dice), heal, diemod (die plus Þrek modifier), none.
 * template uses {die} for the actor's Þrek die, for example "2{die}" becomes 2d8, and {mod} for the Þrek modifier.
 */
export const THREK_ARTS = [
  { name: "Prologue", style: "The Play", act: "special", kind: "die", roll: "Initiative bonus", template: "1{die}",
    text: "When you roll initiative, spend one Þrek die and roll it. Add the number to your initiative roll and to the initiative roll of one ally within 30 feet that can see or hear you. You can't be surprised." },
  { name: "Act I: Exposé", style: "The Play", act: "special", kind: "die", roll: "Attack roll bonus", template: "1{die}",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and roll it. The target is exposed until the start of your next turn. Choose yourself or one ally within 30 feet that can see you. The next attack roll that creature makes against the target adds the number rolled." },
  { name: "Act II: Rise", style: "The Play", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}",
    text: "When you hit a creature with a weapon attack on your turn, spend one Þrek die and add it to the damage. The number carries over: the next weapon attack you hit with before the end of your turn adds the same number to its damage, against any creature." },
  { name: "Act III: Climax", style: "The Play", act: "reaction", kind: "die", roll: "Bonus damage", template: "1{die}",
    text: "<strong>Trigger:</strong> A creature within your reach misses you with an attack. Spend one Þrek die. As a reaction, make one weapon attack against that creature with advantage and add the die to the damage." },
  { name: "Act IV: Fall", style: "The Play", act: "special", kind: "save", save: "str", template: "2{die}",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and roll it twice. Add both numbers to the damage. If the target is Huge or smaller, it makes a Strength saving throw. On a failure, it is knocked prone." },
  { name: "Act V: Resolute", style: "The Play", act: "reaction", kind: "none",
    text: "<strong>Trigger:</strong> Damage would reduce you to 0 hit points but not kill you outright. Spend one Þrek die. As a reaction, you drop to 1 hit point instead, and until the end of your next turn, damage can't reduce you below 1 hit point." },
  { name: "Epilogue", style: "The Play", act: "special", kind: "heal", template: "1{die}", temp: false,
    text: "When you reduce a creature to 0 hit points with a weapon attack, spend one Þrek die and roll it. You and each ally of your choice within 30 feet that can see you regain hit points equal to the number rolled." },
  { name: "Enhance Step", style: "Enhance", act: "bonus", kind: "none",
    text: "As a bonus action, spend one Þrek die. In a blur, you teleport up to 30 feet to an unoccupied space you can see. You can bring one willing Medium or smaller creature within 5 feet of you. It appears in an unoccupied space within 5 feet of your destination." },
  { name: "Enhance Armament", style: "Enhance", act: "bonus", kind: "save", save: "con", template: "",
    text: "As a bonus action, spend one Þrek die. Until the end of your turn, one weapon you are holding counts as magical. The first creature you hit with it this turn makes a Constitution saving throw. On a failure, it is blinded until the end of its next turn." },
  { name: "Enhance Sight", style: "Enhance", act: "bonus", kind: "none",
    text: "As a bonus action, spend one Þrek die. For 1 minute, you have darkvision out to 60 feet, you can see invisible creatures within 30 feet, and your weapon attacks ignore half cover and three-quarters cover." },
  { name: "Enhance Skin", style: "Enhance", act: "reaction", kind: "diemod", roll: "Damage reduction", template: "1{die} + {mod}",
    text: "<strong>Trigger:</strong> You take bludgeoning, piercing, or slashing damage. As a reaction, spend one Þrek die and roll it. Reduce the damage by the number rolled plus your Þrek ability modifier." },
  { name: "Willful Punish", style: "Willful", act: "special", kind: "save", save: "wis", template: "1{die}",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The target makes a Wisdom saving throw. On a failure, it has disadvantage on attack rolls against targets other than you until the end of your next turn." },
  { name: "Willful Praise", style: "Willful", act: "bonus", kind: "heal", template: "1{die} + {mod}", temp: true,
    text: "As a bonus action, choose another creature within 60 feet that can see or hear you and spend one Þrek die. It gains temporary hit points equal to the die roll plus your Þrek ability modifier, and it can end one charmed or frightened effect on itself." },
  { name: "Enhance Reach", act: "bonus", kind: "none", style: "Enhance",
    text: "As a bonus action, spend one Þrek die. For 1 minute, your weapons' reach increases by 5 feet, and the normal and long ranges of your ranged weapons increase by 30 feet." },
  { name: "Enhance Skill", act: "reaction", kind: "none", style: "Enhance",
    text: "<strong>Trigger:</strong> You are about to make a saving throw. As a reaction, spend one Þrek die. You have advantage on that saving throw." },

  /* Spear [Hoplite Form]. Mark: Held. */
  { name: "Form 1: Travel", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Spear [Hoplite Form]", role: "Builder",
    text: "When you make a weapon attack, before you roll, spend one Þrek die. That attack has an extra 5 feet of reach and deals extra damage equal to the die on a hit." },
  { name: "Form 2: Muleta", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Spear [Hoplite Form]", role: "Opener",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The target is <strong>Held</strong> until the start of your next turn: its speed is halved." },
  { name: "Form 7: Landaise", act: "reaction", kind: "save", save: "str", template: "1{die}", style: "Spear [Hoplite Form]", role: "Builder",
    text: "<strong>Trigger:</strong> A hostile creature moves at least 20 feet in a straight line toward you and ends its move within your reach. Spend one Þrek die. Make one weapon attack against it with advantage and add the die to the damage. If it is <strong>Held</strong>, add a second die and it must succeed on a Strength saving throw or be knocked prone." },
  { name: "Form 11: Two Horn Thrust", act: "reaction", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Spear [Hoplite Form]", role: "Builder",
    text: "<strong>Trigger:</strong> A hostile creature moves into your reach. Spend one Þrek die. Make one weapon attack against it and add the die to the damage. On a hit, its speed becomes 0 until the end of the turn." },
  { name: "Form 21: Heaven's Blinding Brazen Light", act: "special", kind: "save", save: "str", template: "2{die}", style: "Spear [Hoplite Form]", role: "Finisher",
    text: "When you hit a <strong>Held</strong> creature with a weapon attack, spend one Þrek die and roll it twice. Add both numbers to the damage. If the target is Large or smaller, it must succeed on a Strength saving throw or be restrained until the end of your next turn, pinned on the weapon. The mark ends." },

  /* Great Axe. Mark: Notched. */
  { name: "Notch", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Great Axe", role: "Opener",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and roll it. Add the number to the damage. The target is <strong>Notched</strong> until the start of your next turn: the next weapon attack that hits it deals extra damage equal to the number rolled." },
  { name: "Limb", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Great Axe", role: "Builder",
    text: "As part of the Attack action, in place of one attack, spend one Þrek die. Make one weapon attack against every creature within your reach, and add the die to the damage on each hit. Each creature you hit with it becomes <strong>Notched</strong>." },
  { name: "Grind", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Great Axe", role: "Builder",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The damage ignores resistance to the weapon's damage type." },
  { name: "Uproot", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Great Axe", role: "Builder",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. You tear its footing loose: the target's AC is reduced by 2 until the start of your next turn." },
  { name: "Timber", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Great Axe", role: "Builder",
    text: "When you reduce a creature to 0 hit points with a weapon attack, or score a critical hit with one, spend one Þrek die. Like a falling tree, the blow carries on: make one weapon attack against a different creature within the weapon's reach or range, and add the die to the damage. This costs no action or bonus action." },
  { name: "Fell", act: "special", kind: "save", save: "con", template: "3{die}", style: "Great Axe", role: "Finisher",
    text: "When you hit a <strong>Notched</strong> creature with a weapon attack, spend one Þrek die and roll it three times. Add all three numbers to the damage. If the target is Huge or smaller, it must succeed on a Constitution saving throw or be knocked prone and stunned until the end of your next turn. The mark ends." },

  /* Sword. Mark: Measured. */
  { name: "Mise en Place", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Sword", role: "Opener",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The target is <strong>Measured</strong> until the end of your next turn, and your next attack roll against it has advantage." },
  { name: "Score", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Sword", role: "Builder",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and roll it. Add the number to the damage. The target is cut: at the start of its next turn, it takes damage equal to the number rolled." },
  { name: "Saute", act: "bonus", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Sword", role: "Builder",
    text: "As a bonus action, spend one Þrek die. Move up to half your speed without provoking opportunity attacks. The next weapon attack you make this turn against a creature within 5 feet of where you end has advantage and adds the die to the damage." },
  { name: "Chiffonade", act: "bonus", kind: "save", save: "wis", template: "", style: "Sword", role: "Builder",
    text: "As a bonus action, spend one Þrek die and choose a creature within 5 feet of you. It must succeed on a Wisdom saving throw. On a failure, it can't take reactions until the start of your next turn and it becomes <strong>Measured</strong>." },
  { name: "Simmer", act: "reaction", kind: "diemod", roll: "Damage reduction", template: "1{die} + {mod}", style: "Sword", role: "Builder",
    text: "<strong>Trigger:</strong> A melee attack hits you. Spend one Þrek die and roll it. Reduce the damage by the number rolled plus your Þrek modifier. If this reduces the damage to 0, you can make one weapon attack against the attacker as part of the same reaction, and it becomes <strong>Measured</strong>." },
  { name: "Sear", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Sword", role: "Builder",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The wound is sealed shut with hot Megin: the target can't regain hit points until the end of its next turn." },
  { name: "Braise", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Sword", role: "Builder",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The slow cut weakens the target: it has disadvantage on its next attack roll before the end of its next turn." },
  { name: "Mince", act: "special", kind: "die", roll: "Bonus damage", template: "2{die}", style: "Sword", role: "Finisher",
    text: "When you hit a <strong>Measured</strong> creature with a weapon attack, spend one Þrek die and roll it twice. Add both numbers to the damage. If the target is below half its hit points, roll the die three times instead. The mark ends." },

  /* Bow. Mark: Marked. */
  { name: "Overcast", act: "bonus", kind: "none", style: "Bow", role: "Opener",
    text: "As a bonus action, spend one Þrek die and choose a creature you can see within 120 feet. It is <strong>Marked</strong> for 1 minute or until you mark another. You know its distance and direction, and your ranged weapon attacks against it ignore half cover." },
  { name: "Sprinkle", act: "bonus", kind: "none", style: "Bow", role: "Builder",
    text: "As a bonus action, spend one Þrek die. Until the end of your turn, being in a hostile creature's reach does not impose disadvantage on your ranged weapon attacks, and long range does not either." },
  { name: "Downpour", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Bow", role: "Builder",
    text: "As part of the Attack action, in place of all your attacks, spend one Þrek die. Make one thrown or ranged weapon attack against each creature you choose within range, up to four. Add the die to the damage of each hit against a <strong>Marked</strong> creature." },
  { name: "Thunder", act: "reaction", kind: "none", style: "Bow", role: "Builder",
    text: "<strong>Trigger:</strong> A ranged weapon attack targets you or an ally within 30 feet that you can see. Spend one Þrek die. Make a ranged weapon attack roll. If your roll equals or beats the incoming attack roll, that attack misses." },
  { name: "Cyclone", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Bow", role: "Builder",
    text: "When you make a thrown or ranged weapon attack, before you roll, spend one Þrek die. The attack ignores half cover and three-quarters cover, and has advantage if the target is <strong>Marked</strong>. On a hit, add the die to the damage." },
  { name: "Storm", act: "special", kind: "die", roll: "Bonus damage", template: "3{die}", style: "Bow", role: "Finisher",
    text: "When you hit a <strong>Marked</strong> creature with a ranged weapon attack, spend one Þrek die and roll it three times. Add all three numbers to the damage. The creature can't regain hit points until the end of your next turn. The mark ends." },

  /* Shield. Mark: Braced. */
  { name: "Stop", act: "bonus", kind: "none", style: "Shield", role: "Opener",
    text: "As a bonus action, spend one Þrek die. Until the start of your next turn, you are <strong>Braced</strong>: you can't be pushed, pulled or knocked prone against your will, and you gain a +2 bonus to AC." },
  { name: "Yield", act: "reaction", kind: "diemod", roll: "Damage reduction", template: "1{die} + {mod}", style: "Shield", role: "Builder",
    text: "<strong>Trigger:</strong> An attack hits you or an ally within 10 feet of you that you can see. Spend one Þrek die and roll it. Reduce the damage by the number rolled plus your Þrek modifier." },
  { name: "Detour", act: "reaction", kind: "die", roll: "AC bonus", template: "1{die}", style: "Shield", role: "Builder",
    text: "<strong>Trigger:</strong> A creature you can see within 5 feet of you is targeted by an attack. Spend one Þrek die. You become the target of the attack instead, and you add the die to your AC against it." },
  { name: "Wrong Way", act: "reaction", kind: "save", save: "str", template: "1{die} + {mod}", style: "Shield", role: "Builder",
    text: "<strong>Trigger:</strong> A creature hits you with a melee attack. Spend one Þrek die and roll it. The attacker takes force damage equal to the number rolled plus your Þrek modifier and must succeed on a Strength saving throw or be pushed 5 feet away from you. If you are <strong>Braced</strong>, roll the die twice." },
  { name: "Hazard", act: "bonus", kind: "save", save: "dex", template: "1{die} + {mod}", style: "Shield", role: "Builder",
    text: "As a bonus action, spend one Þrek die. Until the start of your next turn, the ground within 10 feet of you is a hazard. It is difficult terrain for hostile creatures, and a hostile creature that enters it or starts its turn there must succeed on a Dexterity saving throw or take force damage equal to the die roll plus your Þrek modifier. If you are <strong>Braced</strong>, the area is 15 feet." },
  { name: "Dead End", act: "special", kind: "save", save: "str", template: "1{die}", style: "Shield", role: "Finisher",
    text: "As part of the Attack action, in place of one attack, spend one Þrek die. Move up to 10 feet in a straight line and make one weapon attack against a creature at the end of the move, adding the die to the damage. If you are <strong>Braced</strong>, roll the die twice. The target must succeed on a Strength saving throw or be pushed 10 feet and knocked prone. If there is a wall or another creature in the way, it takes an extra die of damage instead of being pushed. The mark ends." },

  /* Hammer. Mark: Rattled. */
  { name: "Rattle", act: "special", kind: "save", save: "con", template: "1{die}", style: "Hammer", role: "Opener",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The target must succeed on a Constitution saving throw or be <strong>Rattled</strong> until the start of your next turn: it can't take reactions, and its concentration is broken." },
  { name: "Stagger", act: "special", kind: "save", save: "str", template: "1{die}", style: "Hammer", role: "Builder",
    text: "When you hit a creature with a weapon attack, spend one Þrek die and add it to the damage. The target must succeed on a Strength saving throw or be pushed 10 feet and have its speed reduced by 10 feet until the end of its next turn." },
  { name: "Sunder", act: "special", kind: "die", roll: "Bonus damage", template: "2{die}", style: "Hammer", role: "Builder",
    text: "When you hit a creature wearing armor, a construct, or an object with a weapon attack, spend one Þrek die. Roll the die twice and add both numbers to the damage. If the target is <strong>Rattled</strong>, the damage ignores resistance." },
  { name: "Shatter", act: "special", kind: "save", save: "con", template: "3{die}", style: "Hammer", role: "Finisher",
    text: "When you hit a <strong>Rattled</strong> creature, or a prone creature, with a weapon attack, spend one Þrek die and roll it three times. Add all three numbers to the damage. If the target is Huge or smaller, it must succeed on a Constitution saving throw or be stunned until the end of your next turn. The mark ends." },
  { name: "Eviscerate", act: "special", kind: "die", roll: "Bonus damage", template: "4{die}", style: "Hammer", role: "Finisher",
    text: "When you hit a <strong>Rattled</strong> creature that is below half its hit points with a weapon attack, spend one Þrek die and roll it four times. Add all four numbers to the damage. The creature can't regain hit points until the end of your next turn. The mark ends." },

  /* Thrown Weapon [Bouncing Beetle Style]. Mark: Tagged. */
  { name: "Tag", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Thrown Weapon [Bouncing Beetle Style]", role: "Opener",
    text: "When you hit a creature with a thrown or ranged weapon attack, spend one Þrek die and add it to the damage. The target is <strong>Tagged</strong> until the start of your next turn." },
  { name: "Bouncing Beetle", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Thrown Weapon [Bouncing Beetle Style]", role: "Builder",
    text: "When you hit a creature with a weapon attack, spend one Þrek die. The force carries on to a second creature you can see within 10 feet of the target and within the weapon's reach or range. Make one more attack roll against it with the same bonus, and add the die to the damage on a hit. Features that add damage once per turn do not apply to this second attack." },
  { name: "Scarab's Demise", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Thrown Weapon [Bouncing Beetle Style]", role: "Builder",
    text: "When you hit a creature with a thrown weapon attack, spend one Þrek die. The weapon swings back and makes a second attack roll, with the same bonus, against a <strong>Tagged</strong> creature within 30 feet of you (it can be the same one). On a hit, add the die to the damage. The weapon then returns to your hand." },
  { name: "Blue Rhinoceros Bouncing Beetle", act: "special", kind: "die", roll: "Bonus damage", template: "1{die}", style: "Thrown Weapon [Bouncing Beetle Style]", role: "Finisher",
    text: "When you hit a creature with a thrown weapon attack, spend one Þrek die and roll it. The weapon bounces from creature to creature: after the first hit, it can bounce to a different creature within 15 feet of the last one hit, up to three bounces. Make one attack roll for each bounce with the same bonus. Each hit deals extra damage equal to the number rolled, and a <strong>Tagged</strong> creature takes it twice. Tagged marks end on every creature this hits. The weapon then returns to your hand." }
];

const slug = n => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");

const artItems = THREK_ARTS.map(a => ({
  key: `threk-${slug(a.name)}`,
  category: "threk",
  name: a.name,
  img: ICON_THREK,
  sub: a.style ?? "",
  desc: (a.style ? p(`<em>${a.style}${a.role ? `, ${a.role}` : ""}</em>`) : "") + p(a.text) + p("Spend one Þrek die. At most one Art per attack or trigger. Needs a short chant and a trained movement. Damage and effects count as Megin."),
  activities: [{ name: a.name, kind: a.kind, activation: a.act, save: a.save ?? null, roll: a.roll ? { name: a.roll } : null, template: a.template ?? "", temp: !!a.temp, spend: "threk" }]
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
    key: "regin", category: "regin", name: "Regin", img: "icons/svg/sword.svg",
    desc: p("<em>Passive.</em> Regin is Megin held in your gear. It is always on, takes no action, and has no uses to track.")
      + ul([
        "Attacks you make with a weapon or object you are holding or wearing, or with your fists, count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage. Any object works as an improvised weapon, and ammunition fired from such a ranged weapon counts too.",
        "It removes the Lost's resistance to normal weapons and adds no damage or attack bonus of its own, so it restores a normal hit instead of making you stronger.",
        "It doesn't scale with level."
      ])
      + p("Against the Hverfa Swarm and Horde, which resist nonmagical bludgeoning, piercing and slashing damage, Regin always has a job."),
    activities: []
  },

  /* ---------- Þrek ---------- */
  {
    key: "threk-dice", category: "threk", name: "Þrek Dice", img: ICON_THREK, pool: "threk",
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
    key: "seidr-points", category: "seidr", name: "Seiðr Points", img: ICON_SEIDR, pool: "seidr",
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
    key: "seidr-list", category: "seidr", name: "Seiðr Spell List", img: ICON_SEIDR,
    desc: ul([
      "Cantrips: Fire Bolt, Frostbite, Ray of Frost, Shocking Grasp, Thunderclap.",
      "1st: Absorb Elements, Burning Hands, Ice Knife, Shield, Thunderwave.",
      "2nd: Flame Blade, Gust of Wind, Levitate, Scorching Ray, Shatter.",
      "3rd: Fireball, Lightning Bolt, Sleet Storm, Wind Wall.",
      "4th: Fire Shield, Ice Storm, Stoneskin, Wall of Fire."
    ]) + p("Drag any spell onto the Seiðr box on the Trace tab, or use the add buttons, and it becomes a Seiðr spell paid for with Seiðr Points."),
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
