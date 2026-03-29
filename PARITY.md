# SMAUG 2.0 TypeScript Port — Feature Parity Report

**Generated:** 2026-03-29  
**Baseline:** Legacy SMAUG 2.0 C source (~200,000 lines)  
**Target:** `/home/ubuntu/smaug-ts/` TypeScript port  
**Method:** Exhaustive code-level verification of every command, system, and feature  

---

## Summary

| Category | DONE | PARTIAL | MISSING | Total |
|---|---|---|---|---|
| Player Movement Commands | 8 | 2 | 7 | 17 |
| Player Combat Commands | 15 | 0 | 7 | 22 |
| Player Travel Commands | 5 | 0 | 6 | 11 |
| Player Information Commands | 12 | 0 | 4 | 16 |
| Player Interaction Commands | 13 | 3 | 30 | 46 |
| Player Communication Commands | 13 | 8 | 6 | 27 |
| Player Colour Commands | 0 | 0 | 4 | 4 |
| Player Economy Commands | 8 | 0 | 0 | 8 |
| Immortal/Admin Commands | 31 | 3 | 73 | 107 |
| Social Commands | 1 | 0 | 0 | 1 |
| Game Systems | 10 | 9 | 5 | 24 |
| Data Persistence | 2 | 2 | 1 | 5 |
| Network & Protocol | 2 | 1 | 2 | 5 |
| Admin Dashboard & Browser UI | 3 | 1 | 1 | 5 |
| **Totals** | **123** | **29** | **146** | **298** |

---

## Player Movement Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| north | `doNorth` → `moveChar` | ✅ | DONE | Full movement with exit checks, door, sector, followers, flee |
| south | `doSouth` → `moveChar` | ✅ | DONE | Same moveChar delegation |
| east | `doEast` → `moveChar` | ✅ | DONE | Same moveChar delegation |
| west | `doWest` → `moveChar` | ✅ | DONE | Same moveChar delegation |
| up | `doUp` → `moveChar` | ✅ | DONE | Same moveChar delegation |
| down | `doDown` → `moveChar` | ✅ | DONE | Same moveChar delegation |
| open | `doOpen` | ✅ | DONE | Door open with key/lock checks |
| close | `doClose` | ✅ | DONE | Door close logic |
| lock | `doLock` | ✅ | PARTIAL | Stub — calls `doDoor` but lock-specific logic minimal |
| unlock | `doUnlock` | ✅ | PARTIAL | Stub — calls `doDoor` but unlock-specific logic minimal |
| pick | `doPick` | ✅ | MISSING | Stub body — no lock-picking logic |
| climb | — | ❌ | MISSING | No handler |
| drag | — | ❌ | MISSING | No handler |
| dismount | — | ❌ | MISSING | No handler |
| mount | — | ❌ | MISSING | No handler |
| shove | — | ❌ | MISSING | No handler |
| survey | — | ❌ | MISSING | No handler (overland system) |

---

## Player Combat Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| kill | `doKill` | ✅ | DONE | Full target selection + combat initiation |
| murder | `doMurder` | ✅ | DONE | Full murder with PK flags |
| wimpy | `doWimpy` | ✅ | DONE | Full wimpy threshold logic |
| rescue | `doRescue` | ✅ | DONE | Full rescue with skill check |
| kick | `doKick` | ✅ | DONE | Skill-based kick damage |
| bash | `doBash` | ✅ | DONE | Full bash with stun/position |
| trip | `doTrip` | ✅ | DONE | Full trip with dex check |
| backstab | `doBackstab` | ✅ | DONE | Full backstab with skill/weapon checks |
| circle | `doCircle` | ✅ | DONE | Full circle-stab logic |
| disarm | `doDisarm` | ✅ | DONE | Full disarm with weapon checks |
| gouge | `doGouge` | ✅ | DONE | Skill-based gouge |
| bite | `doBite` | ✅ | DONE | Vampire bite attack |
| claw | `doClaw` | ✅ | DONE | Claw attack |
| tail | `doTail` | ✅ | DONE | Tail attack |
| stun | `doStun` | ✅ | DONE | Stun with lag |
| berserk | — | ❌ | MISSING | No handler |
| bloodlet | — | ❌ | MISSING | No handler (vampire) |
| cleave | — | ❌ | MISSING | No handler |
| draw | — | ❌ | MISSING | No handler (archery) |
| poison_weapon | — | ❌ | MISSING | No handler |
| pounce | — | ❌ | MISSING | No handler |
| slice | — | ❌ | MISSING | No handler |

---

## Player Travel Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| recall | `doRecall` | ✅ | DONE | Full recall with temple lookup |
| enter | `doEnter` | ✅ | DONE | Portal/exit enter |
| leave | `doLeave` | ✅ | DONE | Leave enclosed area |
| flee | `doFlee` | ✅ | DONE | Full flee with random direction |
| exits | — via `doLook` | ✅ | DONE | Exit listing in look command |
| follow | — | ❌ | MISSING | No handler |
| climb | — | ❌ | MISSING | No handler |
| shove | — | ❌ | MISSING | No handler |
| survey | — | ❌ | MISSING | No handler |
| withdraw | — | ❌ | MISSING | No handler (arena) |
| dismount | — | ❌ | MISSING | No handler |

---

## Player Information Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| look | `doLook` | ✅ | DONE | Room/object/person/direction look |
| examine | `doExamine` | ✅ | DONE | Object condition + extra descs |
| score | `doScore` | ✅ | DONE | Full character stat display |
| who | `doWho` | ✅ | DONE | Player list with level/class/filters |
| where | `doWhere` | ✅ | DONE | Player/mob locations in area |
| help | `doHelp` | ✅ | DONE | Help file lookup |
| time | `doTime` | ✅ | DONE | Game time + real time |
| weather | `doWeather` | ✅ | DONE | Full weather display |
| affects | `doAffects` | ✅ | DONE | Active affect list |
| equipment | `doEquipment` | ✅ | DONE | Worn equipment display |
| inventory | `doInventory` | ✅ | DONE | Carried items list |
| consider | `doConsider` | ✅ | DONE | Full level-difference assessment |
| glance | — | ❌ | MISSING | No handler |
| wizwho | — | ❌ | MISSING | No handler |
| changes | — | ❌ | MISSING | No handler |
| hlist | — | ❌ | MISSING | No handler |

---

## Player Interaction Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| get | `doGet` | ✅ | DONE | Get from room/container with weight checks |
| drop | `doDrop` | ✅ | DONE | Drop with quantity support |
| put | `doPut` | ✅ | DONE | Put in container with weight/capacity |
| give | `doGive` | ✅ | PARTIAL | Missing GIVE_PROG trigger on NPC |
| wear | `doWear` | ✅ | DONE | Wear with slot/level/class checks |
| remove | `doRemove` | ✅ | DONE | Remove worn equipment |
| eat | `doEat` | ✅ | PARTIAL | Missing pill spell-effect application |
| drink | `doDrink` | ✅ | DONE | Full drink with poison/drunk effects |
| fill | `doFill` | ✅ | DONE | Fill from fountain logic |
| sacrifice | `doSacrifice` | ✅ | DONE | Sacrifice for gold |
| loot | `doLoot` | ✅ | PARTIAL | Missing PK ownership checks |
| cast | `cmdCast` | ✅ | DONE | Full 13-step cast pipeline |
| practice | `cmdPractice` | ✅ | DONE | Practice at trainer with int/wis modifiers |
| ask | — | ❌ | MISSING | No handler |
| buy | via `economy.ts` | ✅ | DONE | Via ShopSystem |
| sell | via `economy.ts` | ✅ | DONE | Via ShopSystem |
| compare | — | ❌ | MISSING | No handler |
| cook | — | ❌ | MISSING | No handler |
| council_induct | — | ❌ | MISSING | No handler |
| council_outcast | — | ❌ | MISSING | No handler |
| findnote | — | ❌ | MISSING | No handler |
| fire | — | ❌ | MISSING | No handler (archery) |
| gohome | — | ❌ | MISSING | No handler (housing) |
| group | — | ❌ | MISSING | No handler |
| gwhere | — | ❌ | MISSING | No handler |
| hold | — | ❌ | MISSING | No handler |
| house | — | ❌ | MISSING | No handler |
| play | — | ❌ | MISSING | No handler (instruments) |
| pour | — | ❌ | MISSING | No handler |
| quaff | `cmdQuaff` | ✅ | DONE | Full potion consumption |
| brandish | `cmdBrandish` | ✅ | DONE | Full staff brandish |
| zap | `cmdZap` | ✅ | DONE | Full wand zap |
| recite | `cmdRecite` | ✅ | DONE | Full scroll recite with int check |
| rent | — | ❌ | MISSING | No handler |
| rest | — | ❌ | MISSING | No handler (position change) |
| share | — | ❌ | MISSING | No handler |
| sheath | — | ❌ | MISSING | No handler |
| sit | — | ❌ | MISSING | No handler (position change) |
| sleep | — | ❌ | MISSING | No handler (position change) |
| split | — | ❌ | MISSING | No handler |
| stand | — | ❌ | MISSING | No handler (position change) |
| take | — | ❌ | MISSING | No handler (alias for get) |
| tip | — | ❌ | MISSING | No handler |
| unholster | — | ❌ | MISSING | No handler |
| order | — | ❌ | MISSING | No handler |
| repair | via `economy.ts` | ✅ | DONE | Via ShopSystem |

---

## Player Communication Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| say | `doSay` | ✅ | DONE | Full room say with language translation |
| tell | `doTell` | ✅ | DONE | Full tell with deaf/ignore/trust checks |
| reply | `doReply` | ✅ | DONE | Reply to last tell |
| whisper | `doWhisper` | ✅ | DONE | Full whisper with room check |
| shout | `doShout` | ✅ | DONE | Full continent-wide shout |
| gtell | `doGtell` | ✅ | DONE | Group tell implementation |
| emote | `doEmote` | ✅ | DONE | Full emote with act() |
| deaf | `doDeaf` | ✅ | DONE | Channel deaf toggle |
| ignore | `doIgnore` | ✅ | DONE | Full ignore list management |
| speak | `doSpeak` | ✅ | DONE | Language selection |
| languages | `doLanguages` | ✅ | DONE | List known languages |
| chat | `doChat` | ✅ | PARTIAL | Thin wrapper over talkChannel — full channel logic exists |
| yell | `doYell` | ✅ | PARTIAL | Thin wrapper — area scope check |
| clantalk | `doClanTalk` | ✅ | PARTIAL | Thin wrapper — clan membership check in talkChannel |
| ordertalk | `doOrderTalk` | ✅ | PARTIAL | Thin wrapper |
| counciltalk | `doCouncilTalk` | ✅ | PARTIAL | Thin wrapper |
| guildtalk | `doGuildTalk` | ✅ | PARTIAL | Thin wrapper |
| music | `doMusic` | ✅ | PARTIAL | Thin wrapper |
| newbiechat | `doNewbieChat` | ✅ | PARTIAL | Thin wrapper |
| immtalk | `doImmtalk` | ✅ | DONE | Channel with trust check |
| racetalk | `doRaceTalk` | ✅ | DONE | Channel with race check |
| say_to | — | ❌ | MISSING | No handler |
| retell | — | ❌ | MISSING | No handler |
| beckon | — | ❌ | MISSING | No handler |
| dismiss | — | ❌ | MISSING | No handler |
| repeat | — | ❌ | MISSING | No handler (tell history) |
| wartalk | `doWartalk` | ✅ | PARTIAL | Thin wrapper — needs PK check |

---

## Player Colour Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| color | — | ❌ | MISSING | No handler for color config command |
| color default | — | ❌ | MISSING | No reset-to-defaults |
| color theme | — | ❌ | MISSING | No theme system |
| color ansi | — | ❌ | MISSING | No ANSI toggle command |

> Note: The `AnsiColors` utility module is fully implemented with colorize/strip/wrap functions. Only the player-facing configuration commands are missing.

---

## Player Economy Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| list | `doList` | ✅ | DONE | ShopSystem list with keeper inventory |
| buy | `doBuy` | ✅ | DONE | Full purchase with haggle |
| sell | `doSell` | ✅ | DONE | Full sell with haggle |
| value | `doValue` | ✅ | DONE | Appraise item value |
| repair | `doRepair` | ✅ | DONE | Repair item via shopkeeper |
| auction | `doAuction` | ✅ | DONE | Full auction with tick-based bidding |
| bid | `doBid` | ✅ | DONE | Auction bidding |
| bank | `doBank` | ✅ | DONE | Deposit/withdraw/balance |

---

## Immortal/Admin Commands

| Command | Handler | Registered | Status | Notes |
|---|---|---|---|---|
| authorize | `doAuthorize` | ✅ | DONE | Full auth workflow |
| freeze | `doFreeze` | ✅ | DONE | Toggle freeze flag |
| silence | `doSilence` | ✅ | DONE | Toggle silence flag |
| noshout | `doNoshout` | ✅ | DONE | Toggle noshout flag |
| notell | `doNotell` | ✅ | DONE | Toggle notell flag |
| log | `doLog` | ✅ | DONE | Toggle logging on player |
| goto | `doGoto` | ✅ | DONE | Full room teleport |
| transfer | `doTransfer` | ✅ | DONE | Transfer player to location |
| at | `doAt` | ✅ | DONE | Execute at location |
| bamfin | `doBamfin` | ✅ | DONE | Set bamfin message |
| bamfout | `doBamfout` | ✅ | DONE | Set bamfout message |
| purge | `doPurge` | ✅ | DONE | Purge room NPCs/objects |
| mload | `doMload` | ✅ | DONE | Load mobile by vnum |
| oload | `doOload` | ✅ | DONE | Load object by vnum |
| slay | `doSlay` | ✅ | DONE | Kill character instantly |
| force | `doForce` | ✅ | DONE | Force command execution |
| snoop | `doSnoop` | ✅ | DONE | Monitor player I/O |
| switch | `doSwitch` | ✅ | DONE | Switch into mobile |
| return | `doReturn` | ✅ | DONE | Return from switch |
| ban | `doBan` | ✅ | DONE | Full ban with type/duration |
| allow | `doAllow` | ✅ | DONE | Remove ban |
| reboot | `doReboot` | ✅ | PARTIAL | Logs + notifies but no actual process restart |
| shutdown | `doShutdown` | ✅ | PARTIAL | Logs + notifies but no actual process exit |
| copyover | `doCopyover` | ✅ | PARTIAL | Logs + saves state but no exec() hot-restart |
| set | `doSet` | ✅ | DONE | Set char/mob/obj properties |
| stat | `doStat` | ✅ | DONE | Show entity stats |
| advance | `doAdvance` | ✅ | DONE | Advance player level |
| trust | `doTrust` | ✅ | DONE | Modify trust level |
| restore | `doRestore` | ✅ | DONE | Restore HP/mana/move |
| heal | `doHeal` | ✅ | MISSING | Stub body (2 lines) |
| peace | `doPeace` | ✅ | DONE | Stop all fights in room |
| echo | `doEcho` | ✅ | DONE | Room echo |
| gecho | `doGecho` | ✅ | DONE | Global echo |
| users | `doUsers` | ✅ | DONE | Show connected descriptors |
| memory | `doMemory` | ✅ | DONE | Show memory stats |
| wizhelp | `doWizhelp` | ✅ | DONE | Immortal command list |
| redit | `doRedit` | ✅ | DONE | Full OLC room editor |
| medit | `doMedit` | ✅ | DONE | Full OLC mobile editor |
| oedit | `doOedit` | ✅ | DONE | Full OLC object editor |
| mpedit | `doMpedit` | ✅ | DONE | MUDprog editor |
| aedit | `doAedit` | ✅ | DONE | Area editor |
| invis | — | ❌ | MISSING | No handler |
| ghost | — | ❌ | MISSING | No handler |
| dnd | — | ❌ | MISSING | No handler |
| holylight | — | ❌ | MISSING | No handler |
| wizlock | — | ❌ | MISSING | No handler |
| restrict | — | ❌ | MISSING | No handler |
| deny | — | ❌ | MISSING | No handler |
| disconnect | — | ❌ | MISSING | No handler |
| forceclose | — | ❌ | MISSING | No handler |
| pcrename | — | ❌ | MISSING | No handler |
| delete_char | — | ❌ | MISSING | No handler |
| mortalize | — | ❌ | MISSING | No handler |
| immortalize | — | ❌ | MISSING | No handler |
| reset | — | ❌ | MISSING | No handler (area reset command) |
| loadup | — | ❌ | MISSING | No handler |
| savearea | — | ❌ | MISSING | No handler |
| installarea | — | ❌ | MISSING | No handler |
| mredit | — | ❌ | MISSING | No handler (separate from medit) |
| oredit | — | ❌ | MISSING | No handler (separate from oedit) |
| wstat | — | ❌ | MISSING | No handler |
| bestow | — | ❌ | MISSING | No handler |
| cset | — | ❌ | MISSING | No handler |
| mset | — | ❌ | MISSING | No handler |
| oset | — | ❌ | MISSING | No handler |
| rset | — | ❌ | MISSING | No handler |
| sset | — | ❌ | MISSING | No handler |
| hset | — | ❌ | MISSING | No handler |
| aassign | — | ❌ | MISSING | No handler |
| massign | — | ❌ | MISSING | No handler |
| rassign | — | ❌ | MISSING | No handler |
| vassign | — | ❌ | MISSING | No handler |
| regoto | — | ❌ | MISSING | No handler |
| retransfer | — | ❌ | MISSING | No handler |
| rat | — | ❌ | MISSING | No handler |
| minvoke | — | ❌ | MISSING | No handler (alias for mload) |
| oinvoke | — | ❌ | MISSING | No handler (alias for oload) |
| statshield | — | ❌ | MISSING | No handler |
| scatter | — | ❌ | MISSING | No handler |
| strew | — | ❌ | MISSING | No handler |
| watch | — | ❌ | MISSING | No handler |
| mwhere | — | ❌ | MISSING | No handler |
| ofind | — | ❌ | MISSING | No handler |
| mfind | — | ❌ | MISSING | No handler |
| gfighting | — | ❌ | MISSING | No handler |
| oclaim | — | ❌ | MISSING | No handler |
| bodybag | — | ❌ | MISSING | No handler |
| makeadminlist | — | ❌ | MISSING | No handler |
| adminlist | — | ❌ | MISSING | No handler |
| immhost | — | ❌ | MISSING | No handler |
| setvault | — | ❌ | MISSING | No handler |
| last | — | ❌ | MISSING | No handler |
| wizlist | — | ❌ | MISSING | No handler |
| retiredlist | — | ❌ | MISSING | No handler |
| ipcompare | — | ❌ | MISSING | No handler |
| check_vnums | — | ❌ | MISSING | No handler |
| vnums | — | ❌ | MISSING | No handler |
| vsearch | — | ❌ | MISSING | No handler |
| vstat | — | ❌ | MISSING | No handler |
| rstat | — | ❌ | MISSING | No handler |
| mstat | — | ❌ | MISSING | No handler |
| ostat | — | ❌ | MISSING | No handler |
| loop | — | ❌ | MISSING | No handler |
| low_purge | — | ❌ | MISSING | No handler |
| balzhur | — | ❌ | MISSING | No handler |
| elevate | — | ❌ | MISSING | No handler |
| nohomepage | — | ❌ | MISSING | No handler |
| nodesc | — | ❌ | MISSING | No handler |
| nohttp | — | ❌ | MISSING | No handler |
| nobio | — | ❌ | MISSING | No handler |
| nobeckon | — | ❌ | MISSING | No handler |
| delay | — | ❌ | MISSING | No handler |
| hell | — | ❌ | MISSING | No handler |
| unhell | — | ❌ | MISSING | No handler |

---

## Social Commands

| Feature | Module | Status | Notes |
|---|---|---|---|
| Social system (JSON-based) | `social.ts` + `registerSocialCommands.ts` | DONE | 20 socials loaded from `world/socials.json`; full act() message formatting with char/others/victim/auto variants; file-based social loading; registration via `CommandRegistry.registerSocial()` |

> Legacy had ~200+ socials in `socials.dat`. Current port has 20 pre-defined. Additional socials can be added to `world/socials.json` without code changes.

---

## Game Systems

| System | Module(s) | Status | Notes |
|---|---|---|---|
| Combat Engine | `CombatEngine.ts` (373L) | DONE | Full multi_hit, one_hit, damage pipeline with weapon types, dual wield, position modifiers |
| Damage Calculator | `DamageCalculator.ts` (190L) | DONE | Full AC calculation, damage reduction, critical hits, damage types |
| Death Handler | `DeathHandler.ts` (298L) | DONE | Full death processing: corpse creation, equipment transfer, XP loss, ghost state |
| Spell Engine | `SpellEngine.ts` (334L) | DONE | Full 13-step doCast pipeline: mana cost, target resolution, concentration check, saves |
| Spell Registry | `SpellRegistry.ts` (1401L) | DONE | 180+ spell definitions with all target types, damage types, components |
| Saving Throws | `SavingThrows.ts` (63L) | DONE | Full level-based save tables |
| Component System | `ComponentSystem.ts` (85L) | DONE | Spell component consumption |
| Affect Manager | `AffectManager.ts` (317L) | DONE | Full affect apply/remove/tick/strip pipeline |
| Affect Registry | `AffectRegistry.ts` (466L) | DONE | 60+ pre-defined affects with durations and modifiers |
| Stat Modifier | `StatModifier.ts` (358L) | DONE | Full stat modification tables (str/dex/con/int/wis apply tables) |
| Area Manager | `AreaManager.ts` (447L) | DONE | Full JSON area loading, hot-reload support, vnum registration |
| Reset Engine | `ResetEngine.ts` (345L) | DONE | Full reset processing (M/O/P/G/E/D/R/T commands) |
| Room Manager | `RoomManager.ts` (34L) | PARTIAL | Stub — basic Map<vnum, Room> but no exit traversal, room flag helpers |
| Vnum Registry | `VnumRegistry.ts` (120L) | DONE | Full prototype registry with duplicate detection |
| Weather System | `WeatherSystem.ts` (431L) | DONE | Full weather with temperature, wind, precipitation, area-specific |
| Quest System | `QuestSystem.ts` (576L) | PARTIAL | Quest definition/tracking present but completion triggers limited |
| Clan System | `ClanSystem.ts` (567L) | DONE | Full clan create/disband/induct/outcast/donate/withdraw/wars |
| Board System | `BoardSystem.ts` (534L) | DONE | Full note post/read/remove with board types |
| Deity System | `DeitySystem.ts` (369L) | DONE | Full deity creation, favour mechanics, suscept/resist |
| Housing System | `HousingSystem.ts` (334L) | PARTIAL | House creation/management but missing furniture, guest lists |
| MUDProg Engine | `MudProgEngine.ts` (246L) | PARTIAL | Script execution framework but limited trigger type support |
| MUDProg Script Parser | `ScriptParser.ts` (372L) | PARTIAL | Parses if/else/endif but limited command set |
| MUDProg Ifchecks | `IfcheckRegistry.ts` (648L) | DONE | 50+ ifcheck functions (rand, isnpc, mobinroom, etc.) |
| MUDProg Variables | `VariableSubstitution.ts` (169L) | DONE | Full $n/$N/$t/$T/$r variable substitution |

---

## Data Persistence

| Feature | Module | Status | Notes |
|---|---|---|---|
| Player Save/Load | `PlayerRepository.ts` (633L) | DONE | Full Prisma-based player persistence with inventory, affects, skills |
| World Save/Load | `WorldRepository.ts` (310L) | DONE | JSON-based area file loading and writing |
| Legacy .are Import | `AreFileParser.ts` (66L) | MISSING | Stub — returns empty data |
| Legacy Player Import | `PlayerFileParser.ts` (44L) | MISSING | Stub — returns empty results |
| Migration Runner | `MigrationRunner.ts` (46L) | MISSING | Stub — no actual migration logic |

> Note: While legacy import is stubbed, the new persistence layer (Prisma + JSON) is fully functional for new data.

---

## Network & Protocol

| Feature | Module | Status | Notes |
|---|---|---|---|
| WebSocket Server | `WebSocketServer.ts` (89L) | DONE | Express + ws + Socket.IO setup |
| Connection Manager | `ConnectionManager.ts` (911L) | DONE | Full nanny state machine (15 states), login, character creation, pager |
| Telnet Protocol | `TelnetProtocol.ts` (13L) | MISSING | Stub — no IAC/NAWS/MCCP/MSSP/MXP negotiation |
| Socket.IO Adapter | `SocketIOAdapter.ts` (13L) | MISSING | Stub — no Socket.IO-specific features |
| Pager System | in `ConnectionManager.ts` | PARTIAL | Basic pager framework exists but no dynamic page-size growth or PCFLAG_PAGERON toggle |

---

## Admin Dashboard & Browser UI

| Feature | Module | Status | Notes |
|---|---|---|---|
| Admin REST API | `AdminRouter.ts` (434L) | DONE | Full CRUD endpoints for players, areas, bans, commands |
| Auth Controller | `AuthController.ts` (144L) | DONE | JWT + bcrypt authentication |
| Monitoring Controller | `MonitoringController.ts` (237L) | DONE | Server stats, connected players, memory, tick info |
| Dashboard HTML UI | `DashboardUI.ts` (421L) | PARTIAL | 4 pages (Dashboard, Players, Areas, Logs) rendered but some features are placeholder JS |
| Browser Play Client | — | MISSING | No `src/client/` directory or React play UI |

---

## Additional Systems

| System | Status | Notes |
|---|---|---|
| Time System | PARTIAL | `WeatherSystem` includes game time tracking; missing standalone `time_update()` cycle |
| Overland Travel | MISSING | No overland map system (`overland.c` equivalent) |
| Alias System | MISSING | No player command aliases |
| Pager Colors | MISSING | No `descriptor.pagecolor` / color-in-pager support |
| Command Lag Tracking | DONE | `CommandRegistry` tracks execution time and lag counts |
| Command Queue | DONE | `CommandRegistry.queueCommand/processQueue` for wait-state delayed commands |
| Substate System | PARTIAL | `ConnectionState.Editing` for OLC; missing full `SUB_*` substate values |
| News System | MISSING | No news post/read commands |
| Wait/Lag Macro | DONE | `ch.wait` decremented per tick, commands blocked while `wait > 0` |
| Command Flags | DONE | `CMD_FLAG_POSSESS`, `CMD_FLAG_POLYMORPHED`, etc. checked in dispatch |
| Logging (Command) | DONE | `logCommand()` with `LOG_NORMAL/HIGH/ALWAYS` levels + global `fLogAll` |
| Watch System | MISSING | No per-immortal watch file logging |
| Tell History | MISSING | No `pc_data.tell_history[26]` per-letter storage |
| Nuisance System | MISSING | No nuisance tracking/escalating lag |
| Marriage System | MISSING | No `marry.c` equivalent |
| Dragonflight | MISSING | No `dragonflight.c` equivalent |
| Planes System | MISSING | No `_planes.c` equivalent |
| Tracking System | MISSING | No `track.c` equivalent |
| Identification System | MISSING | No `ident.c` equivalent |
| Star Map | MISSING | No `starmap.c` equivalent |

---

## Test Coverage Summary

- **64 test files** with **1,628 passing tests**
- All existing tests pass (`npx vitest run` — 0 failures)
- `npx tsc --noEmit` — 0 type errors
- Test stubs (`it.todo()`) added for all PARTIAL and MISSING items below

---

*End of PARITY.md*
