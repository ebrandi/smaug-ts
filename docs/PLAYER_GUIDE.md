# SMAUG 2.0 TypeScript — Player Guide

> Welcome to SMAUG 2.0! This guide covers everything you need to know to
> connect, create a character, and explore the world. Whether you are a
> seasoned MUD veteran or a complete newcomer, read on for a comprehensive
> introduction.

---

## Table of Contents

1. [Welcome](#welcome)
2. [Connecting](#connecting)
3. [Your First Session](#your-first-session)
4. [Character Creation](#character-creation)
5. [Movement](#movement)
6. [Combat](#combat)
7. [Magic](#magic)
8. [Skills](#skills)
9. [Inventory and Equipment](#inventory-and-equipment)
10. [Economy](#economy)
11. [Communication](#communication)
12. [Groups](#groups)
13. [Quests](#quests)
14. [Clans and Guilds](#clans-and-guilds)
15. [Player Housing](#player-housing)
16. [Information Commands](#information-commands)
17. [Tips and Tricks](#tips-and-tricks)
18. [FAQ](#faq)

---

## Welcome

SMAUG 2.0 is a text-based multiplayer role-playing game — a **MUD**
(Multi-User Dungeon). You explore a vast fantasy world, fight monsters, cast
spells, learn skills, trade with shops, join clans, complete quests, and
interact with other players — all through text commands.

The game runs in real time. Combat happens automatically once engaged, spells
have casting times, and the world carries on around you whether you are typing
or not. Read descriptions carefully, experiment with commands, and do not be
afraid to ask for help.

---

## Connecting

### Browser Client

The easiest way to play is through your web browser:

1. Open the game's URL in any modern browser (e.g.
   `http://your-mud-address:4000`).
2. The terminal appears automatically.
3. Type your commands in the input field at the bottom and press Enter.

Features of the browser client:

- Full ANSI colour rendering.
- Input history — use the Up and Down arrow keys to recall previous commands.
- Automatic scrolling.
- Works on desktop and mobile devices.

### MUD Client

For a richer experience, connect using a dedicated MUD client:

| Client | Platform | Connection |
|---|---|---|
| [Mudlet](https://www.mudlet.org/) | Windows, macOS, Linux | WebSocket: `ws://your-mud-address:4000/ws` |
| [TinTin++](https://tintin.mudhalla.net/) | Linux, macOS | WebSocket: `ws://your-mud-address:4000/ws` |
| [Blightmud](https://github.com/Blightmud/Blightmud) | Linux, macOS | WebSocket: `ws://your-mud-address:4000/ws` |

MUD clients offer features like triggers, aliases, scripting, and split-screen
layouts that enhance the playing experience.

---

## Your First Session

When you connect for the first time, you will see a welcome screen followed by:

```
By what name do you wish to be known?
```

1. **Choose a name.** Pick a fantasy-appropriate name. Names like "Aelindra",
   "Theron", or "Brannick" work well. Avoid modern names, profanity, or names
   that resemble existing NPCs.

2. **Set a password.** Choose a strong password. You will be asked to confirm
   it.

3. **Select your sex.** Choose Male, Female, or Neutral.

4. **Select your race.** Each race has different stat bonuses:

   | Race | Strengths | Weaknesses |
   |---|---|---|
   | Human | Balanced, versatile | No special bonuses |
   | Elf | High dexterity and intelligence | Lower constitution |
   | Dwarf | High constitution and strength | Lower dexterity |
   | Halfling | High dexterity and luck | Lower strength |
   | Half-Elf | Good dexterity and charisma | Slightly lower strength |
   | Half-Orc | High strength | Lower intelligence and charisma |
   | Gnome | High intelligence and luck | Lower strength |

5. **Select your class.** This determines your combat style, available spells,
   and skills:

   | Class | Style | Primary Stat |
   |---|---|---|
   | Warrior | Melee combat, high HP | Strength |
   | Mage | Offensive spells, area damage | Intelligence |
   | Cleric | Healing, defensive spells | Wisdom |
   | Thief | Stealth, backstab, lockpicking | Dexterity |
   | Ranger | Nature skills, tracking, archery | Dexterity |
   | Druid | Nature magic, shapeshifting | Wisdom |
   | Paladin | Holy combat, healing | Strength + Wisdom |
   | Augurer | Divination, enchantment | Intelligence |

6. **Read the Message of the Day** and press Enter to enter the game.

You appear in the starting room — typically the Temple of Midgaard. Type
`look` to see your surroundings, and you are ready to begin your adventure.

---

## Character Creation

### Stats

Your character has seven attributes:

| Stat | Abbreviation | Effect |
|---|---|---|
| Strength | STR | Melee damage, carrying capacity |
| Intelligence | INT | Mana pool, spell power |
| Wisdom | WIS | Mana regeneration, cleric spells |
| Dexterity | DEX | Dodge, thief skills, AC bonus |
| Constitution | CON | Hit point gain per level, HP regen |
| Charisma | CHA | Shop prices, social interactions |
| Luck | LCK | Critical hits, saving throws, loot |

Stats start based on your race and class, with a range of 3–25. Equipment,
spells, and affects can modify stats beyond these limits.

### Vitals

- **Hit Points (HP)** — Your health. At 0 or below, you are incapacitated.
  At deep negative values, you die.
- **Mana** — Magical energy for casting spells. Regenerates over time.
- **Movement** — Physical stamina used for travelling. Each room costs
  movement based on terrain.

### Alignment

Your alignment ranges from -1000 (deeply evil) to +1000 (saintly good).
Alignment affects: which spells you can use, which equipment you can wear,
deity relationships, and how NPCs react to you.

---

## Movement

### Basic Directions

Move between rooms by typing a direction:

```
north    (or n)
south    (or s)
east     (or e)
west     (or w)
up       (or u)
down     (or d)
northeast (or ne)
northwest (or nw)
southeast (or se)
southwest (or sw)
```

### Doors

Some exits have doors that may be closed or locked:

```
open north          # Open the door to the north
close north         # Close it
lock north          # Lock it (requires the key)
unlock north        # Unlock it (requires the key)
pick north          # Pick the lock (thief skill)
```

### Movement Cost

Different terrain costs different amounts of movement:

| Terrain | Cost |
|---|---|
| Inside / City | 1–2 |
| Field / Forest | 2–3 |
| Hills / Mountain | 4–6 |
| Water (swim) | 4 |
| Underwater | 6 |
| Desert | 6 |
| Air | 10 |

Carrying heavy loads increases movement cost. The `AFF_FLYING` effect
eliminates terrain-based movement costs.

### Other Movement

```
recall          # Teleport to your recall point (temple)
enter <portal>  # Enter a magical portal
flee            # Escape from combat (random direction)
mount <animal>  # Mount a rideable creature
dismount        # Dismount
```

---

## Combat

### Starting a Fight

```
kill <target>       # Attack a monster
murder <target>     # Attack (works on players in PK)
```

Once combat begins, you automatically attack each combat round (every 3
seconds). Your character continues fighting until one side is dead, flees, or
is otherwise separated.

### Combat Skills

Use skills during combat for additional damage or effects:

```
backstab <target>   # Surprise attack from behind (thief, must not be fighting)
kick                # Kick your opponent
bash                # Shield bash — may stun
trip                # Trip your opponent — they fall
disarm              # Knock weapon from opponent's hand
gouge               # Gouge eyes — may blind
rescue <ally>       # Intercept attacks meant for an ally
flee                # Attempt to escape
```

### Combat Information

During combat, your prompt shows your current HP and your opponent's condition.
Watch for messages like:

- *"You are in excellent condition."* — near full HP
- *"You have a few scratches."* — minor damage
- *"You are in awful condition."* — near death

### Wimpy

Set an automatic flee threshold:

```
wimpy 50            # Flee automatically when HP drops below 50
wimpy 0             # Disable auto-flee
```

### Death

If your HP reaches a lethal threshold, you die. On death:

- Your corpse appears in the room containing your equipment.
- You lose some experience points.
- You return to your recall point (temple) as a ghost.
- Return to your corpse room and `get all corpse` to retrieve your belongings.

---

## Magic

### Casting Spells

```
cast '<spell name>'                  # Cast on yourself
cast '<spell name>' <target>         # Cast on a specific target
```

Note the single quotes around multi-word spell names:

```
cast 'magic missile' goblin
cast 'cure light'
cast 'armour'
cast 'detect invis'
```

### Mana

Spells cost mana. The cost depends on the spell, your level, and your class.
Mana regenerates over time — faster when resting or sleeping, and faster with
higher wisdom.

### Spell Types

| Category | Examples |
|---|---|
| **Offensive** | magic missile, fireball, lightning bolt, acid blast |
| **Healing** | cure light, cure serious, cure critical, heal |
| **Protective** | armour, shield, sanctuary, stone skin |
| **Detection** | detect invis, detect magic, detect hidden, truesight |
| **Enhancement** | bless, giant strength, haste, fly |
| **Debuff** | blindness, poison, curse, sleep, weaken |
| **Utility** | identify, locate object, word of recall, gate |

### Saving Throws

When a harmful spell hits you, you may get a saving throw to reduce or negate
the effect. Higher saving throw values (from equipment and affects) improve
your chances of resisting.

### Using Magic Items

```
quaff <potion>        # Drink a potion (casts its spells on you)
recite <scroll>       # Read a scroll
brandish <staff>      # Wave a staff (area effect)
zap <wand> <target>   # Zap a wand at a target
```

---

## Skills

### Learning Skills

Visit a trainer or guildmaster to practise:

```
practice              # List all skills/spells and proficiency
practice <skill>      # Spend a practice session to improve
```

You gain practice sessions when you level up. Each practice session improves
your proficiency by a fixed amount. You can also improve by using skills
successfully in combat — the game teaches you through experience.

### Proficiency

Skill proficiency ranges from 0% to 95% (the "adept" level). Higher
proficiency means higher success chance. NPCs are assumed to have 75%
proficiency in all skills.

### Key Skills by Class

| Class | Signature Skills |
|---|---|
| Warrior | bash, kick, disarm, parry, dodge, dual wield, enhanced damage |
| Mage | cast (all offensive spells), meditate, scribe |
| Cleric | cast (healing/protective), sanctuary, heal, resurrect |
| Thief | backstab, steal, pick lock, hide, sneak, circle, detrap |
| Ranger | track, hunt, archery, camouflage, tame |
| Druid | nature spells, herbalism, control weather |
| Paladin | lay hands, smite, detect evil, protective aura |
| Augurer | enchant, identify, farsight, clairvoyance |

### Weapon Skills

Your proficiency with weapon types also improves through use:

- Swords, daggers, maces, axes, spears, staves, whips, bows, etc.

---

## Inventory and Equipment

### Viewing

```
inventory     (or i)     # List items you are carrying
equipment     (or eq)    # List equipped items
look <item>              # Examine an item
examine <item>           # Detailed examination (condition, contents)
```

### Picking Up and Dropping

```
get <item>               # Pick up from the ground
get all                  # Pick up everything
get <item> <container>   # Get from a container
drop <item>              # Drop on the ground
drop all                 # Drop everything
put <item> <container>   # Put in a container
```

### Equipping

```
wear <item>              # Wear or wield an item
wield <sword>            # Wield a weapon
hold <item>              # Hold an item
remove <item>            # Remove equipped item
```

Items have wear locations: head, body, arms, legs, feet, hands, waist,
wrists, fingers, neck, shield, wielded weapon, held item, ears, eyes, back,
face, and ankles.

### Containers

```
open <container>         # Open a bag, chest, etc.
close <container>        # Close it
lock <container>         # Lock with a key
unlock <container>       # Unlock with a key
look in <container>      # See contents
```

### Item Condition

Weapons and armour degrade with use. Visit a repair shop to restore them:

```
repair <item>            # Repair a single item
repairall                # Repair all damaged equipment (10% surcharge)
```

---

## Economy

### Currency

The game uses three tiers of currency:

| Currency | Abbreviation | Value |
|---|---|---|
| Copper | cp | 1 |
| Silver | sp | 100 cp |
| Gold | gp | 10,000 cp |

### Shops

Find a shopkeeper and use:

```
list                     # See what the shop sells
buy <item>               # Purchase an item
sell <item>              # Sell an item
value <item>             # Appraise how much a shop will pay
```

Prices are affected by your charisma and race. Elves get a discount; half-orcs
pay a premium.

### Banking

Find a banker NPC and use:

```
deposit <amount> <gold|silver|copper>
withdraw <amount> <gold|silver|copper>
balance                  # Check your bank balance
transfer <amount> <currency> <player>
```

Your bank balance persists across sessions.

### Auctions

Players can auction items to the entire server:

```
auction <item>           # Start an auction
bid <amount>             # Bid on the current auction
```

Auctions run for several rounds with announcements to all players.

---

## Communication

### Talking

```
say <message>            # Speak to everyone in the room
tell <player> <message>  # Private message to a player
reply <message>          # Reply to the last person who told you
whisper <player> <msg>   # Whisper to someone in the room
emote <action>           # Roleplay action (e.g., "emote smiles warmly")
```

### Channels

Global and group channels broadcast to all subscribed players:

```
chat <message>           # Global chat channel
shout <message>          # Shout to your area
yell <message>           # Yell within the room and adjacent rooms
newbiechat <message>     # Newbie help channel
music <message>          # Music channel
clantalk <message>       # Clan-only channel
counciltalk <message>    # Council-only channel
guildtalk <message>      # Guild-only channel
racetalk <message>       # Race-only channel
wartalk <message>        # PK war channel
gtell <message>          # Group tell (your group only)
```

Toggle a channel on/off by typing the channel name with no message:

```
chat                     # Toggle chat channel on/off
```

### Socials

Express emotions and actions:

```
smile                    # You smile happily.
bow <player>             # You bow before Gandalf.
hug <player>             # You hug Gandalf.
wave                     # You wave.
```

There are over 200 social commands. Type `socials` to see a full list.

### Language

Characters can speak different languages based on their race:

```
speak common             # Switch to common tongue
speak elvish             # Switch to elvish
languages                # List languages you know
```

If another player does not understand the language you are speaking, your
words appear garbled to them.

### Ignoring Players

```
ignore <player>          # Add player to your ignore list
ignore                   # Show your ignore list
```

Ignored players cannot send you tells, whispers, or directed socials.

### Tell History

Review recent tells by letter:

```
repeat a                 # Show tells starting with 'a'
repeat                   # Show all recent tells
```

---

## Groups

Team up with other players to tackle dangerous areas:

```
group <player>           # Invite a player to your group
group                    # Show current group members
follow <player>          # Follow another player
gtell <message>          # Send a message to your group
split <amount>           # Split gold evenly among group members
```

Group benefits:
- **Shared experience** — XP from kills is divided among group members.
- **Group movement** — Followers automatically move with their leader.
- **Group communication** — `gtell` for private group chat.

To leave a group: `follow self`

To disband a group: `group disband`

---

## Quests

NPCs may offer quests — tasks you can complete for rewards:

```
quest request            # Ask a questmaster for a quest
quest info               # View your current quest details
quest complete           # Turn in a completed quest
quest time               # Check remaining quest time
quest list               # See available quest rewards
quest buy <item>         # Buy a reward with quest points
```

Quest types include:
- **Kill quests** — Slay a specific mobile.
- **Fetch quests** — Find and return a specific object.

Rewards include gold, quest points, and practice sessions. Quest points
accumulate and can be spent on special items from the questmaster.

---

## Clans and Guilds

### Clans

Clans are player organisations for socialising and PK (player killing):

```
clantalk <message>       # Clan-only channel
clanlist                 # List all clans
```

Clan membership requires an invitation from a clan leader and typically a
minimum level of 10. Some clans are PK-oriented (the "deadly" flag), while
others are non-PK.

### Guilds

Guilds are class-specific organisations that provide access to unique skills:

```
guildtalk <message>      # Guild-only channel
```

### Councils

Councils are administrative groups with special powers:

```
counciltalk <message>    # Council-only channel
```

### Joining

You cannot join clans, guilds, or councils on your own. A leader or officer
must use `induct <your-name>` to bring you in.

---

## Player Housing

Own a home in the game world:

```
gohome                   # Teleport to your house entrance
house info               # View house details
```

Houses provide:
- A safe place to store items.
- Multiple rooms (expandable up to 6).
- Furniture and decorations.

Buying a house requires gold and may involve an auction process. Ask in-game
for details on available properties.

---

## Information Commands

### Looking Around

```
look                     # View the room, exits, objects, and characters
look <target>            # Look at a character, object, or extra description
look in <container>      # Look inside a container
exits                    # List obvious exits
```

### Character Information

```
score                    # Your full character sheet
affects                  # List active spells and affects on you
time                     # Current game time and date
weather                  # Current weather conditions
who                      # List all online players
where                    # Find players in your area
consider <target>        # Estimate how dangerous a target is
```

### Help System

```
help                     # General help
help <topic>             # Help on a specific topic
help <command>           # Help on a command
```

The help system has entries for most commands, races, classes, spells, and
game mechanics. If you cannot find what you need, ask on the `newbiechat`
channel.

---

## Tips and Tricks

1. **Use abbreviations.** You do not need to type full command names. `n` for
   north, `k` for kill, `l` for look, `i` for inventory, `eq` for equipment.

2. **Identify items before wearing them.** Use `cast 'identify' <item>` or
   take the item to an identify shop. Some items have curses or unwanted
   effects.

3. **Rest to regenerate faster.** Sit or sleep when not in combat to recover
   HP, mana, and movement more quickly.

4. **Set your wimpy.** `wimpy 30` will automatically flee when your HP drops
   below 30. This can save your life.

5. **Explore carefully.** Some rooms have traps, aggressive monsters, or
   environmental hazards. Use `consider <mob>` before attacking.

6. **Practice at trainers.** Do not waste practice sessions on skills you will
   rarely use. Focus on your class's core abilities first.

7. **Bank your gold.** Carry only what you need. Banks keep your wealth safe
   from death loss.

8. **Join a group for tough areas.** Grouping splits experience but greatly
   increases survivability.

9. **Read room descriptions.** Extra descriptions are hidden in the text. Try
   `look <keyword>` on interesting objects mentioned in descriptions.

10. **Use the `scan` command** (if available) to see creatures in adjacent
    rooms before moving.

11. **Keep a light source.** Some areas are dark. Carry a torch or lantern, or
    cast `continual light`.

12. **Learn from failure.** Failing a skill attempt can still improve your
    proficiency. Keep trying.

13. **Save regularly.** Your character auto-saves periodically, but you can
    type `save` manually before risky situations.

14. **Ask for help.** The `newbiechat` channel is monitored by experienced
    players and administrators. Do not be shy.

---

## FAQ

**Q: How do I create a character?**
A: Connect to the game and follow the on-screen prompts. You will choose a
name, password, sex, race, and class.

**Q: How do I save my character?**
A: Your character saves automatically on a regular interval, on quit, and on
death. You can also type `save` at any time.

**Q: I died! What do I do?**
A: You respawn at your recall point. Return to where you died and type
`get all corpse` to retrieve your equipment. Hurry — corpses decompose after
a few game ticks.

**Q: How do I level up?**
A: Gain enough experience points by killing monsters. When you have enough XP,
you automatically advance to the next level. Check `score` to see your current
XP and how much you need.

**Q: What class should I play?**
A: Warriors are the simplest for beginners — high HP, straightforward combat.
Thieves are fun but require more strategy. Mages deal massive damage but are
fragile. Clerics are the best support class.

**Q: How do I get more mana?**
A: Level up (each level grants mana), increase your intelligence and wisdom
stats, wear mana-boosting equipment, and rest to regenerate.

**Q: How do I make money?**
A: Kill monsters and sell their loot to shops. Complete quests for gold
rewards. Auction valuable items to other players.

**Q: What is PK?**
A: Player Killing — combat between players. Only characters with the "deadly"
flag (from joining a PK clan) can engage in PK. If you prefer a safe
experience, join a non-PK clan or no clan at all.

**Q: How do I learn spells?**
A: Find a trainer or guildmaster and type `practice <spell-name>`. You need
available practice sessions (gained by levelling up) and you must meet the
level requirement for the spell.

**Q: Can I change my race or class?**
A: No. Race and class are chosen at character creation and are permanent. You
can create a new character if you want to try a different combination.

**Q: How do I find a specific NPC?**
A: Use `where <name>` to find NPCs in your area, or ask other players. Some
NPCs wander between rooms.

**Q: How does the language system work?**
A: Your character knows certain languages based on race. Use `speak <language>`
to change your speaking language. Other players who do not know that language
will see garbled text.

**Q: How do I use a portal?**
A: Stand in the same room as the portal and type `enter <portal>`.

**Q: What do the colour codes mean?**
A: The game uses ANSI colours to highlight different types of information.
Red typically indicates danger or damage, green indicates healing or success,
and cyan is used for informational text.

**Q: How do I quit the game?**
A: Type `quit`. Your character is saved automatically.

**Q: Is there a map?**
A: Not a graphical one built-in, but many MUD clients (like Mudlet) can
generate maps automatically as you explore. Use `exits` to see available
directions from any room.
