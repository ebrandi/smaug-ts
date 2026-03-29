/**
 * PlayerRepository – Player character persistence via Prisma.
 *
 * Handles loading a player from the database into an in-memory Player
 * entity, saving player state back to the database, and creating new
 * player records during character creation.
 *
 * Replicates legacy save_char_obj() and load_char_obj().
 */

import { PrismaClient } from '@prisma/client';

/** Transaction client type extracted from Prisma. */
type PrismaTransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
import { Player, type PlayerData } from '../game/entities/Player.js';
import type { CharacterInit } from '../game/entities/Character.js';
import { Affect } from '../game/entities/Affect.js';
import { GameObject } from '../game/entities/GameObject.js';
import { VnumRegistry } from '../game/world/VnumRegistry.js';
// AffectManager is available but affects are reapplied directly via affect.applyTo()
import { WearLocation, type ApplyType } from '../game/entities/types.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger();

/**
 * Serialize a bigint-compatible value to a string for Prisma storage.
 */
function bigintToString(val: bigint): string {
  return val.toString();
}

/**
 * Parse a stringified bigint back to bigint.
 */
function stringToBigint(val: string | null | undefined): bigint {
  if (!val) return 0n;
  try {
    return BigInt(val);
  } catch {
    return 0n;
  }
}

export class PlayerRepository {
  private readonly prisma: PrismaClient;
  private readonly vnumRegistry: VnumRegistry | null;

  constructor(prisma: PrismaClient, vnumRegistry?: VnumRegistry | null) {
    this.prisma = prisma;
    this.vnumRegistry = vnumRegistry ?? null;
  }

  /**
   * Save a player character to the database.
   * Uses a Prisma transaction for atomicity across all related tables.
   * Replicates legacy save_char_obj().
   */
  async save(player: Player): Promise<void> {
    const name = player.name;
    if (!name) {
      logger.error('persistence', 'savePlayer: player has no name');
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert core player data
      const permStats = {
        str: player.permStats.str,
        int: player.permStats.int,
        wis: player.permStats.wis,
        dex: player.permStats.dex,
        con: player.permStats.con,
        cha: player.permStats.cha,
        lck: player.permStats.lck,
      };
      const modStats = {
        str: player.modStats.str,
        int: player.modStats.int,
        wis: player.modStats.wis,
        dex: player.modStats.dex,
        con: player.modStats.con,
        cha: player.modStats.cha,
        lck: player.modStats.lck,
      };

      const coreData = {
        name,
        displayName: player.name,
        passwordHash: player.pcData.passwordHash,
        email: player.pcData.email,
        level: player.level,
        sex: player.sex === 0 ? 'NEUTRAL' as const : player.sex === 1 ? 'MALE' as const : 'FEMALE' as const,
        race: player.race,
        class: player.class_,
        trust: player.trust,
        hit: player.hit,
        maxHit: player.maxHit,
        mana: player.mana,
        maxMana: player.maxMana,
        move: player.move,
        maxMove: player.maxMove,
        permStats: permStats,
        modStats: modStats,
        hitroll: player.hitroll,
        damroll: player.damroll,
        armor: player.armor,
        alignment: player.alignment,
        wimpy: player.wimpy,
        numAttacks: player.numAttacks,
        savingPoison: player.savingPoison,
        savingRod: player.savingRod,
        savingPara: player.savingPara,
        savingBreath: player.savingBreath,
        savingSpell: player.savingSpell,
        gold: player.gold,
        silver: player.silver,
        copper: player.copper,
        exp: player.exp,
        goldBalance: player.pcData.goldBalance,
        silverBalance: player.pcData.silverBalance,
        copperBalance: player.pcData.copperBalance,
        actFlags: bigintToString(player.actFlags),
        affectedBy: bigintToString(player.affectedBy),
        immune: bigintToString(player.immune),
        resistant: bigintToString(player.resistant),
        susceptible: bigintToString(player.susceptible),
        position: player.position,
        style: player.style,
        speaking: player.speaking,
        speaks: bigintToString(BigInt(player.speaks)),
        height: player.height,
        weight: player.weight,
        title: player.pcData.title,
        rank: player.pcData.rank,
        bio: player.pcData.bio,
        homepage: player.pcData.homepage,
        prompt: player.pcData.prompt,
        fightPrompt: player.pcData.fightPrompt,
        bamfIn: player.pcData.bamfIn,
        bamfOut: player.pcData.bamfOut,
        clanName: player.pcData.clanName || null,
        councilName: player.pcData.councilName || null,
        deityName: player.pcData.deityName || null,
        favour: player.pcData.favour,
        conditions: player.pcData.conditions,
        pkills: player.pcData.pkills,
        pdeaths: player.pcData.pdeaths,
        mkills: player.pcData.mkills,
        mdeaths: player.pcData.mdeaths,
        illegalPk: player.pcData.illegalPk,
        authState: player.pcData.authState === 0 ? 'CREATED' as const
          : player.pcData.authState === 1 ? 'NAME_CHOSEN' as const
          : player.pcData.authState === 2 ? 'PASSWORD_SET' as const
          : player.pcData.authState === 3 ? 'WAITING_APPROVAL' as const
          : 'AUTHORIZED' as const,
        wizInvis: player.pcData.wizInvis,
        minSnoop: player.pcData.minSnoop,
        bestowments: player.pcData.bestowments,
        flags: bigintToString(player.pcData.flags),
        rRangeLo: player.pcData.rRangeLo,
        rRangeHi: player.pcData.rRangeHi,
        mRangeLo: player.pcData.mRangeLo,
        mRangeHi: player.pcData.mRangeHi,
        oRangeLo: player.pcData.oRangeLo,
        oRangeHi: player.pcData.oRangeHi,
        questNumber: player.pcData.questNumber,
        questCurrent: player.pcData.questCurrent,
        questAccum: player.pcData.questAccum,
        pagerLen: player.pcData.pagerLen,
        pagerOn: player.pcData.pagerOn,
        stances: player.pcData.stances,
        colors: Object.fromEntries(player.pcData.colors),
        ignored: Array.from(player.pcData.ignored).join(' '),
        spouse: player.pcData.spouse,
        lastRoom: (player.inRoom as { vnum?: number } | null)?.vnum ?? 0,
        played: player.pcData.played,
        lastLogin: player.pcData.lastLogin,
        releaseDate: player.pcData.releaseDate,
        helledBy: player.pcData.helledBy,
      };

      await tx.playerCharacter.upsert({
        where: { name },
        create: coreData,
        update: coreData,
      });

      // 2. Delete old affects, then insert current
      await tx.playerAffect.deleteMany({ where: { playerName: name } });
      for (const affect of player.affects) {
        await tx.playerAffect.create({
          data: {
            playerName: name,
            type: affect.type,
            duration: affect.duration,
            location: affect.location,
            modifier: affect.modifier,
            bitvector: bigintToString(affect.bitvector),
          },
        });
      }

      // 3. Delete old inventory + equipment, then insert current
      await tx.playerInventory.deleteMany({ where: { playerName: name } });
      await tx.playerEquipment.deleteMany({ where: { playerName: name } });

      // Save inventory items (handle nested containers)
      await this.saveInventoryRecursive(tx, name, player.inventory as GameObject[], null);

      // Save equipment
      for (const [wearLoc, obj] of player.equipment.entries()) {
        const gameObj = obj as GameObject;
        if (!gameObj) continue;
        await tx.playerEquipment.create({
          data: {
            playerName: name,
            wearLocation: wearLoc,
            objectVnum: gameObj.prototype?.vnum ?? 0,
            objectLevel: gameObj.prototype?.level ?? 1,
            objectValues: gameObj.values,
            objectAffects: gameObj.affects.map(a => ({ location: a.location, modifier: a.modifier })),
            extraFlags: bigintToString(gameObj.extraFlags),
            timer: gameObj.timer,
          },
        });
      }

      // 4. Delete old skills, then insert current
      await tx.playerSkill.deleteMany({ where: { playerName: name } });
      for (const [skillId, proficiency] of player.pcData.learned.entries()) {
        await tx.playerSkill.create({
          data: {
            playerName: name,
            skillNumber: skillId,
            proficiency,
          },
        });
      }

      // 5. Delete old aliases, then insert current
      await tx.playerAlias.deleteMany({ where: { playerName: name } });
      if ((player as Player & { aliases?: Map<string, string> }).aliases) {
        for (const [alias, expansion] of ((player as Player & { aliases: Map<string, string> }).aliases).entries()) {
          await tx.playerAlias.create({
            data: {
              playerName: name,
              alias,
              expansion,
            },
          });
        }
      }
    });

    logger.debug('persistence', `Player saved: ${name}`);
  }

  /**
   * Recursively save inventory items, handling nested containers.
   */
  private async saveInventoryRecursive(
    tx: PrismaTransactionClient,
    playerName: string,
    objects: GameObject[],
    containerId: string | null,
  ): Promise<void> {
    for (const obj of objects) {
      const saved = await tx.playerInventory.create({
        data: {
          playerName,
          objectVnum: obj.prototype?.vnum ?? 0,
          objectLevel: obj.prototype?.level ?? 1,
          objectValues: obj.values,
          objectAffects: obj.affects.map(a => ({ location: a.location, modifier: a.modifier })),
          extraFlags: bigintToString(obj.extraFlags),
          timer: obj.timer,
          containedIn: containerId,
        },
      });

      // Recursively save container contents
      if (obj.contents && obj.contents.length > 0) {
        await this.saveInventoryRecursive(tx, playerName, obj.contents, saved.id);
      }
    }
  }

  /**
   * Load a player character from the database by name.
   * Reconstructs the full Player entity with affects, inventory, skills, aliases.
   * Replicates legacy load_char_obj().
   */
  async load(name: string): Promise<Player | null> {
    const data = await this.prisma.playerCharacter.findUnique({
      where: { name },
      include: {
        affects: true,
        inventory: {
          include: { contents: true },
        },
        skills: true,
        aliases: true,
        equipment: true,
      },
    });

    if (!data) return null;

    // 1. Build CharacterInit from saved data
    const init: CharacterInit = {
      name: data.name,
      level: data.level,
      sex: data.sex === 'MALE' ? 1 : data.sex === 'FEMALE' ? 2 : 0,
      race: data.race,
      class_: data.class,
      trust: data.trust,
      hitroll: data.hitroll,
      damroll: data.damroll,
      alignment: data.alignment,
      position: data.position,
      actFlags: stringToBigint(data.actFlags),
      affectedBy: 0n, // Will be reapplied via affects
      immune: stringToBigint(data.immune),
      resistant: stringToBigint(data.resistant),
      susceptible: stringToBigint(data.susceptible),
      speaking: data.speaking,
      speaks: Number(stringToBigint(data.speaks)),
      gold: data.gold,
      exp: data.exp,
    };

    // 2. Build PlayerData
    const conditions = (data.conditions as number[]) ?? [48, 48, 48, 0];
    const pcData: Partial<PlayerData> = {
      passwordHash: data.passwordHash,
      email: data.email,
      title: data.title,
      rank: data.rank,
      bio: data.bio,
      prompt: data.prompt,
      fightPrompt: data.fightPrompt,
      bamfIn: data.bamfIn,
      bamfOut: data.bamfOut,
      homepage: data.homepage,
      clanName: data.clanName,
      councilName: data.councilName,
      deityName: data.deityName,
      favour: data.favour,
      conditions: [
        conditions[0] ?? 48,
        conditions[1] ?? 48,
        conditions[2] ?? 48,
        conditions[3] ?? 0,
      ],
      pkills: data.pkills,
      pdeaths: data.pdeaths,
      mkills: data.mkills,
      mdeaths: data.mdeaths,
      illegalPk: data.illegalPk,
      authState: data.authState === 'CREATED' ? 0
        : data.authState === 'NAME_CHOSEN' ? 1
        : data.authState === 'PASSWORD_SET' ? 2
        : data.authState === 'WAITING_APPROVAL' ? 3
        : 4,
      wizInvis: data.wizInvis,
      minSnoop: data.minSnoop,
      bestowments: data.bestowments,
      flags: stringToBigint(data.flags),
      rRangeLo: data.rRangeLo,
      rRangeHi: data.rRangeHi,
      mRangeLo: data.mRangeLo,
      mRangeHi: data.mRangeHi,
      oRangeLo: data.oRangeLo,
      oRangeHi: data.oRangeHi,
      questNumber: data.questNumber,
      questCurrent: data.questCurrent,
      questAccum: data.questAccum,
      goldBalance: data.goldBalance,
      silverBalance: data.silverBalance,
      copperBalance: data.copperBalance,
      pagerLen: data.pagerLen,
      pagerOn: data.pagerOn,
      stances: (data.stances as Record<string, number>) ?? {},
      colors: new Map(Object.entries((data.colors as Record<string, string>) ?? {})),
      ignored: new Set(data.ignored ? data.ignored.split(' ').filter(s => s) : []),
      spouse: data.spouse,
      played: data.played,
      lastLogin: data.lastLogin,
      releaseDate: data.releaseDate,
      helledBy: data.helledBy,
    };

    // 3. Create Player instance
    const player = new Player(init, pcData);
    player.hit = data.hit;
    player.maxHit = data.maxHit;
    player.mana = data.mana;
    player.maxMana = data.maxMana;
    player.move = data.move;
    player.maxMove = data.maxMove;
    player.armor = data.armor;
    player.wimpy = data.wimpy;
    player.numAttacks = data.numAttacks;
    player.silver = data.silver;
    player.copper = data.copper;
    player.style = data.style;
    player.height = data.height;
    player.weight = data.weight;
    player.savingPoison = data.savingPoison;
    player.savingRod = data.savingRod;
    player.savingPara = data.savingPara;
    player.savingBreath = data.savingBreath;
    player.savingSpell = data.savingSpell;
    player.practice = 0; // will restore from xp-based calculation or saved

    // Restore perm/mod stats
    const ps = data.permStats as Record<string, number> | null;
    if (ps) {
      player.permStats = {
        str: ps.str ?? 13,
        int: ps.int ?? 13,
        wis: ps.wis ?? 13,
        dex: ps.dex ?? 13,
        con: ps.con ?? 13,
        cha: ps.cha ?? 13,
        lck: ps.lck ?? 13,
      };
    }
    const ms = data.modStats as Record<string, number> | null;
    if (ms) {
      player.modStats = {
        str: ms.str ?? 0,
        int: ms.int ?? 0,
        wis: ms.wis ?? 0,
        dex: ms.dex ?? 0,
        con: ms.con ?? 0,
        cha: ms.cha ?? 0,
        lck: ms.lck ?? 0,
      };
    }

    // 4. Reconstruct inventory (top-level items, not in containers)
    const inventoryMap = new Map<string, GameObject>();
    for (const invData of data.inventory.filter((i: { containedIn: string | null }) => i.containedIn === null)) {
      const obj = this.reconstructObject(invData);
      player.inventory.push(obj);
      inventoryMap.set(invData.id, obj);
    }

    // 5. Reconstruct nested container contents
    for (const invData of data.inventory.filter((i: { containedIn: string | null }) => i.containedIn !== null)) {
      const container = inventoryMap.get(invData.containedIn!);
      if (container) {
        const obj = this.reconstructObject(invData);
        container.contents.push(obj);
        inventoryMap.set(invData.id, obj);
      }
    }

    // 6. Reconstruct equipment
    for (const eqData of data.equipment) {
      const obj = this.reconstructEquipment(eqData);
      player.equipment.set(eqData.wearLocation as WearLocation, obj);
    }

    // 7. Reconstruct affects and reapply stat modifications
    for (const affData of data.affects) {
      const affect = new Affect(
        affData.type,
        affData.duration,
        affData.location as ApplyType,
        affData.modifier,
        stringToBigint(affData.bitvector),
      );
      player.affects.push(affect);
      // Reapply stat modification
      affect.applyTo(player);
    }

    // 8. Reconstruct skills
    for (const skillData of data.skills) {
      player.pcData.learned.set(skillData.skillNumber, skillData.proficiency);
    }

    // 9. Reconstruct aliases
    if (!(player as Player & { aliases?: Map<string, string> }).aliases) {
      (player as Player & { aliases: Map<string, string> }).aliases = new Map();
    }
    for (const aliasData of data.aliases) {
      ((player as Player & { aliases: Map<string, string> }).aliases).set(aliasData.alias, aliasData.expansion);
    }

    logger.debug('persistence', `Player loaded: ${name}`);
    return player;
  }

  /**
   * Reconstruct a GameObject from inventory database record.
   */
  private reconstructObject(data: {
    objectVnum: number;
    objectLevel: number;
    objectValues: unknown;
    objectAffects: unknown;
    extraFlags: string;
    timer: number;
  }): GameObject {
    const prototype = this.vnumRegistry?.getObject(data.objectVnum);
    if (prototype) {
      const obj = new GameObject(prototype);
      const values = data.objectValues as number[];
      if (Array.isArray(values)) {
        obj.values = [...values];
        while (obj.values.length < 6) obj.values.push(0);
      }
      obj.extraFlags = stringToBigint(data.extraFlags);
      obj.timer = data.timer;
      // Restore object affects (enchantments)
      const objAffects = data.objectAffects as Array<{ location: number; modifier: number }>;
      if (Array.isArray(objAffects)) {
        for (const aff of objAffects) {
          obj.affects.push(new Affect(0, -1, aff.location as ApplyType, aff.modifier, 0n));
        }
      }
      return obj;
    }
    // No prototype available - create a minimal placeholder
    const placeholder = {
      vnum: data.objectVnum,
      name: 'unknown object',
      shortDesc: 'an unknown object',
      longDesc: 'An unknown object is here.',
      description: '',
      itemType: 0,
      extraFlags: stringToBigint(data.extraFlags),
      wearFlags: 0n,
      values: (data.objectValues as number[]) ?? [],
      weight: 0,
      cost: 0,
      rent: 0,
      level: data.objectLevel,
      layers: 0,
      extraDescriptions: [],
      affects: [],
    };
    return new GameObject(placeholder);
  }

  /**
   * Reconstruct a GameObject from equipment database record.
   */
  private reconstructEquipment(data: {
    objectVnum: number;
    objectLevel: number;
    objectValues: unknown;
    objectAffects: unknown;
    extraFlags: string;
    timer: number;
    wearLocation: number;
  }): GameObject {
    const obj = this.reconstructObject(data);
    obj.wearLocation = data.wearLocation as WearLocation;
    return obj;
  }

  /**
   * Delete a player character from the database.
   * Cascading deletes handle all related records (affects, inventory, skills, aliases).
   */
  async delete(name: string): Promise<boolean> {
    try {
      await this.prisma.playerCharacter.delete({
        where: { name },
      });
      logger.info('persistence', `Player deleted: ${name}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a player name exists in the database.
   */
  async exists(name: string): Promise<boolean> {
    const count = await this.prisma.playerCharacter.count({
      where: { name },
    });
    return count > 0;
  }

  /**
   * Get a list of all player names in the database.
   */
  async listAll(): Promise<string[]> {
    const players = await this.prisma.playerCharacter.findMany({
      select: { name: true },
    });
    return players.map(p => p.name);
  }
}

// =============================================================================
// Auto-save functionality for TickEngine integration
// =============================================================================

/** Tracked online players for auto-save. */
const onlinePlayers: Set<Player> = new Set();

/** Register a player for auto-save tracking. */
export function registerOnlinePlayer(player: Player): void {
  onlinePlayers.add(player);
}

/** Unregister a player from auto-save tracking. */
export function unregisterOnlinePlayer(player: Player): void {
  onlinePlayers.delete(player);
}

/**
 * Auto-save all online players.
 * Called on PULSE_TICK (every ~70 seconds) by TickEngine.
 */
export async function autoSaveAllPlayers(repo: PlayerRepository): Promise<void> {
  for (const player of onlinePlayers) {
    try {
      await repo.save(player);
    } catch (err) {
      logger.error('persistence', `Auto-save failed for ${player.name}: ${err}`);
    }
  }
}
