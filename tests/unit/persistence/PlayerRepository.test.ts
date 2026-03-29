import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerRepository, registerOnlinePlayer, unregisterOnlinePlayer, autoSaveAllPlayers } from '../../../src/persistence/PlayerRepository.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Sex, Position, WearLocation, ApplyType } from '../../../src/game/entities/types.js';
import { Affect } from '../../../src/game/entities/Affect.js';

// =============================================================================
// Mock PrismaClient
// =============================================================================

function createMockPrisma() {
  // In-memory store
  const players = new Map<string, any>();
  const affects = new Map<string, any[]>();
  const inventory = new Map<string, any[]>();
  const equipment = new Map<string, any[]>();
  const skills = new Map<string, any[]>();
  const aliases = new Map<string, any[]>();

  let idCounter = 0;

  const mockPrisma = {
    $transaction: async (fn: (tx: any) => Promise<void>) => {
      await fn(mockPrisma);
    },
    playerCharacter: {
      upsert: async ({ where, create, update }: any) => {
        const existing = players.get(where.name);
        if (existing) {
          const updated = { ...existing, ...update };
          players.set(where.name, updated);
          return updated;
        }
        const id = `player_${++idCounter}`;
        const created = { id, ...create };
        players.set(where.name, created);
        return created;
      },
      findUnique: async ({ where, include }: any) => {
        const player = players.get(where.name);
        if (!player) return null;
        return {
          ...player,
          affects: include?.affects ? (affects.get(where.name) ?? []) : undefined,
          inventory: include?.inventory ? (inventory.get(where.name) ?? []).map((i: any) => ({
            ...i,
            contents: (inventory.get(where.name) ?? []).filter((c: any) => c.containedIn === i.id),
          })) : undefined,
          equipment: include?.equipment ? (equipment.get(where.name) ?? []) : undefined,
          skills: include?.skills ? (skills.get(where.name) ?? []) : undefined,
          aliases: include?.aliases ? (aliases.get(where.name) ?? []) : undefined,
        };
      },
      delete: async ({ where }: any) => {
        const existed = players.has(where.name);
        players.delete(where.name);
        affects.delete(where.name);
        inventory.delete(where.name);
        equipment.delete(where.name);
        skills.delete(where.name);
        aliases.delete(where.name);
        if (!existed) throw new Error('Not found');
      },
      count: async ({ where }: any) => {
        return players.has(where.name) ? 1 : 0;
      },
      findMany: async ({ select }: any) => {
        return Array.from(players.values()).map(p => ({ name: p.name }));
      },
    },
    playerAffect: {
      deleteMany: async ({ where }: any) => {
        affects.delete(where.playerName);
      },
      create: async ({ data }: any) => {
        const id = `aff_${++idCounter}`;
        const entry = { id, ...data };
        const list = affects.get(data.playerName) ?? [];
        list.push(entry);
        affects.set(data.playerName, list);
        return entry;
      },
    },
    playerInventory: {
      deleteMany: async ({ where }: any) => {
        inventory.delete(where.playerName);
      },
      create: async ({ data }: any) => {
        const id = `inv_${++idCounter}`;
        const entry = { id, ...data };
        const list = inventory.get(data.playerName) ?? [];
        list.push(entry);
        inventory.set(data.playerName, list);
        return entry;
      },
    },
    playerEquipment: {
      deleteMany: async ({ where }: any) => {
        equipment.delete(where.playerName);
      },
      create: async ({ data }: any) => {
        const id = `eq_${++idCounter}`;
        const entry = { id, ...data };
        const list = equipment.get(data.playerName) ?? [];
        list.push(entry);
        equipment.set(data.playerName, list);
        return entry;
      },
    },
    playerSkill: {
      deleteMany: async ({ where }: any) => {
        skills.delete(where.playerName);
      },
      create: async ({ data }: any) => {
        const id = `sk_${++idCounter}`;
        const entry = { id, ...data };
        const list = skills.get(data.playerName) ?? [];
        list.push(entry);
        skills.set(data.playerName, list);
        return entry;
      },
    },
    playerAlias: {
      deleteMany: async ({ where }: any) => {
        aliases.delete(where.playerName);
      },
      create: async ({ data }: any) => {
        const id = `al_${++idCounter}`;
        const entry = { id, ...data };
        const list = aliases.get(data.playerName) ?? [];
        list.push(entry);
        aliases.set(data.playerName, list);
        return entry;
      },
    },
    _players: players,
    _affects: affects,
    _inventory: inventory,
    _equipment: equipment,
    _skills: skills,
    _aliases: aliases,
  };

  return mockPrisma;
}

// =============================================================================
// Tests
// =============================================================================

describe('PlayerRepository', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let repo: PlayerRepository;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repo = new PlayerRepository(mockPrisma as any);
  });

  describe('save()', () => {
    it('saves a basic player', async () => {
      const player = new Player({ name: 'TestHero', level: 5 });
      player.hit = 80;
      player.maxHit = 100;

      await repo.save(player);
      expect(mockPrisma._players.has('TestHero')).toBe(true);
    });

    it('saves player with correct field mappings', async () => {
      const player = new Player({ name: 'Gandalf', level: 20 });
      player.hit = 200;
      player.maxHit = 250;
      player.mana = 300;
      player.gold = 1000;
      player.alignment = 750;
      player.pcData.title = 'the Grey';
      player.pcData.clanName = 'Istari';

      await repo.save(player);
      const saved = mockPrisma._players.get('Gandalf');
      expect(saved.level).toBe(20);
      expect(saved.hit).toBe(200);
      expect(saved.gold).toBe(1000);
      expect(saved.alignment).toBe(750);
      expect(saved.title).toBe('the Grey');
      expect(saved.clanName).toBe('Istari');
    });

    it('saves player affects', async () => {
      const player = new Player({ name: 'Frodo', level: 10 });
      const affect = new Affect(42, 10, ApplyType.Str, 2, 0n);
      player.affects.push(affect);

      await repo.save(player);
      const savedAffects = mockPrisma._affects.get('Frodo') ?? [];
      expect(savedAffects).toHaveLength(1);
      expect(savedAffects[0].type).toBe(42);
      expect(savedAffects[0].duration).toBe(10);
      expect(savedAffects[0].modifier).toBe(2);
    });

    it('saves player skills', async () => {
      const player = new Player({ name: 'Legolas', level: 15 });
      player.pcData.learned.set(100, 85);
      player.pcData.learned.set(200, 50);

      await repo.save(player);
      const savedSkills = mockPrisma._skills.get('Legolas') ?? [];
      expect(savedSkills).toHaveLength(2);
      expect(savedSkills.find((s: any) => s.skillNumber === 100)?.proficiency).toBe(85);
      expect(savedSkills.find((s: any) => s.skillNumber === 200)?.proficiency).toBe(50);
    });

    it('saves player aliases', async () => {
      const player = new Player({ name: 'Aragorn', level: 20 }) as Player & { aliases: Map<string, string> };
      player.aliases = new Map([['wc', 'wield claymore'], ['hb', 'heal bag']]);

      await repo.save(player as any);
      const savedAliases = mockPrisma._aliases.get('Aragorn') ?? [];
      expect(savedAliases).toHaveLength(2);
    });

    it('re-saves (upserts) existing player', async () => {
      const player = new Player({ name: 'Boromir', level: 10 });
      await repo.save(player);

      player.level = 15;
      await repo.save(player);

      const saved = mockPrisma._players.get('Boromir');
      expect(saved.level).toBe(15);
    });

    it('clears old affects before saving new ones', async () => {
      const player = new Player({ name: 'Gimli', level: 10 });
      player.affects.push(new Affect(1, 5, ApplyType.Str, 1, 0n));
      await repo.save(player);

      // Now save with different affects
      player.affects.length = 0;
      player.affects.push(new Affect(2, 8, ApplyType.Dex, 3, 0n));
      await repo.save(player);

      const savedAffects = mockPrisma._affects.get('Gimli') ?? [];
      expect(savedAffects).toHaveLength(1);
      expect(savedAffects[0].type).toBe(2);
    });

    it('does nothing for player with empty name', async () => {
      const player = new Player({ name: '', level: 1 });
      await repo.save(player);
      expect(mockPrisma._players.size).toBe(0);
    });
  });

  describe('load()', () => {
    it('returns null for non-existent player', async () => {
      const result = await repo.load('NonExistent');
      expect(result).toBeNull();
    });

    it('loads a saved player with correct fields', async () => {
      const original = new Player({ name: 'LoadTest', level: 12 });
      original.hit = 150;
      original.maxHit = 200;
      original.gold = 500;
      original.alignment = 350;
      original.pcData.title = 'the Brave';
      await repo.save(original);

      const loaded = await repo.load('LoadTest');
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('LoadTest');
      expect(loaded!.level).toBe(12);
      expect(loaded!.hit).toBe(150);
      expect(loaded!.maxHit).toBe(200);
      expect(loaded!.gold).toBe(500);
      expect(loaded!.alignment).toBe(350);
      expect(loaded!.pcData.title).toBe('the Brave');
    });

    it('loads and restores affects', async () => {
      const original = new Player({ name: 'AffectTest', level: 10 });
      original.affects.push(new Affect(42, 10, ApplyType.Str, 2, 0n));
      await repo.save(original);

      const loaded = await repo.load('AffectTest');
      expect(loaded).not.toBeNull();
      expect(loaded!.affects).toHaveLength(1);
      expect(loaded!.affects[0]!.type).toBe(42);
      expect(loaded!.affects[0]!.duration).toBe(10);
      expect(loaded!.affects[0]!.modifier).toBe(2);
    });

    it('loads and restores skills', async () => {
      const original = new Player({ name: 'SkillTest', level: 10 });
      original.pcData.learned.set(100, 85);
      await repo.save(original);

      const loaded = await repo.load('SkillTest');
      expect(loaded).not.toBeNull();
      expect(loaded!.pcData.learned.get(100)).toBe(85);
    });

    it('loads and restores aliases', async () => {
      const original = new Player({ name: 'AliasTest', level: 10 }) as Player & { aliases: Map<string, string> };
      original.aliases = new Map([['wc', 'wield claymore']]);
      await repo.save(original as any);

      const loaded = await repo.load('AliasTest') as Player & { aliases?: Map<string, string> };
      expect(loaded).not.toBeNull();
      expect(loaded!.aliases?.get('wc')).toBe('wield claymore');
    });
  });

  describe('delete()', () => {
    it('deletes an existing player', async () => {
      const player = new Player({ name: 'DeleteMe', level: 1 });
      await repo.save(player);

      const result = await repo.delete('DeleteMe');
      expect(result).toBe(true);
      expect(await repo.exists('DeleteMe')).toBe(false);
    });

    it('returns false for non-existent player', async () => {
      const result = await repo.delete('Ghost');
      expect(result).toBe(false);
    });
  });

  describe('exists()', () => {
    it('returns true for existing player', async () => {
      const player = new Player({ name: 'ExistCheck', level: 1 });
      await repo.save(player);
      expect(await repo.exists('ExistCheck')).toBe(true);
    });

    it('returns false for non-existent player', async () => {
      expect(await repo.exists('Nobody')).toBe(false);
    });
  });

  describe('listAll()', () => {
    it('returns all player names', async () => {
      await repo.save(new Player({ name: 'Alice', level: 1 }));
      await repo.save(new Player({ name: 'Bob', level: 2 }));
      await repo.save(new Player({ name: 'Charlie', level: 3 }));

      const names = await repo.listAll();
      expect(names).toHaveLength(3);
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');
      expect(names).toContain('Charlie');
    });

    it('returns empty array when no players', async () => {
      const names = await repo.listAll();
      expect(names).toHaveLength(0);
    });
  });

  describe('autoSaveAllPlayers()', () => {
    it('saves all registered online players', async () => {
      const p1 = new Player({ name: 'Online1', level: 1 });
      const p2 = new Player({ name: 'Online2', level: 2 });
      registerOnlinePlayer(p1);
      registerOnlinePlayer(p2);

      await autoSaveAllPlayers(repo);

      expect(await repo.exists('Online1')).toBe(true);
      expect(await repo.exists('Online2')).toBe(true);

      // Cleanup
      unregisterOnlinePlayer(p1);
      unregisterOnlinePlayer(p2);
    });

    it('handles save errors gracefully', async () => {
      const badPlayer = new Player({ name: '', level: 1 }); // Empty name triggers error path
      registerOnlinePlayer(badPlayer);

      // Should not throw
      await autoSaveAllPlayers(repo);

      unregisterOnlinePlayer(badPlayer);
    });
  });
});
