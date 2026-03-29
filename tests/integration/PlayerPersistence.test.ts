import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerRepository } from '../../src/persistence/PlayerRepository.js';
import { Player } from '../../src/game/entities/Player.js';
import { Affect } from '../../src/game/entities/Affect.js';
import { ApplyType, AFF } from '../../src/game/entities/types.js';

// =============================================================================
// Mock PrismaClient (same pattern as unit test but fresh instance)
// =============================================================================

function createMockPrisma() {
  const players = new Map<string, any>();
  const affects = new Map<string, any[]>();
  const inventory = new Map<string, any[]>();
  const equipment = new Map<string, any[]>();
  const skills = new Map<string, any[]>();
  const aliases = new Map<string, any[]>();
  let idCounter = 0;

  return {
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
          affects: include?.affects ? (affects.get(where.name) ?? []) : [],
          inventory: include?.inventory ? (inventory.get(where.name) ?? []).map((i: any) => ({
            ...i,
            contents: (inventory.get(where.name) ?? []).filter((c: any) => c.containedIn === i.id),
          })) : [],
          equipment: include?.equipment ? (equipment.get(where.name) ?? []) : [],
          skills: include?.skills ? (skills.get(where.name) ?? []) : [],
          aliases: include?.aliases ? (aliases.get(where.name) ?? []) : [],
        };
      },
      delete: async ({ where }: any) => {
        if (!players.has(where.name)) throw new Error('Not found');
        players.delete(where.name);
        affects.delete(where.name);
        inventory.delete(where.name);
        equipment.delete(where.name);
        skills.delete(where.name);
        aliases.delete(where.name);
      },
      count: async ({ where }: any) => players.has(where.name) ? 1 : 0,
      findMany: async () => Array.from(players.values()).map(p => ({ name: p.name })),
    },
    playerAffect: {
      deleteMany: async ({ where }: any) => { affects.delete(where.playerName); },
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
      deleteMany: async ({ where }: any) => { inventory.delete(where.playerName); },
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
      deleteMany: async ({ where }: any) => { equipment.delete(where.playerName); },
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
      deleteMany: async ({ where }: any) => { skills.delete(where.playerName); },
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
      deleteMany: async ({ where }: any) => { aliases.delete(where.playerName); },
      create: async ({ data }: any) => {
        const id = `al_${++idCounter}`;
        const entry = { id, ...data };
        const list = aliases.get(data.playerName) ?? [];
        list.push(entry);
        aliases.set(data.playerName, list);
        return entry;
      },
    },
  };
  // Need to reference the outer variable
  var mockPrisma: any;
  // This is a quirk — we need the reference before assignment
}

describe('Player Persistence Integration', () => {
  let repo: PlayerRepository;

  beforeEach(() => {
    // Create mock prisma and wire self-reference for $transaction
    const store = {
      players: new Map<string, any>(),
      affects: new Map<string, any[]>(),
      inventory: new Map<string, any[]>(),
      equipment: new Map<string, any[]>(),
      skills: new Map<string, any[]>(),
      aliases: new Map<string, any[]>(),
    };
    let idCounter = 0;

    const prisma: any = {
      $transaction: async (fn: any) => await fn(prisma),
      playerCharacter: {
        upsert: async ({ where, create, update }: any) => {
          if (store.players.has(where.name)) {
            const updated = { ...store.players.get(where.name), ...update };
            store.players.set(where.name, updated);
            return updated;
          }
          const created = { id: `p_${++idCounter}`, ...create };
          store.players.set(where.name, created);
          return created;
        },
        findUnique: async ({ where, include }: any) => {
          const player = store.players.get(where.name);
          if (!player) return null;
          return {
            ...player,
            affects: include?.affects ? (store.affects.get(where.name) ?? []) : [],
            inventory: include?.inventory ? (store.inventory.get(where.name) ?? []).map((i: any) => ({
              ...i,
              contents: (store.inventory.get(where.name) ?? []).filter((c: any) => c.containedIn === i.id),
            })) : [],
            equipment: include?.equipment ? (store.equipment.get(where.name) ?? []) : [],
            skills: include?.skills ? (store.skills.get(where.name) ?? []) : [],
            aliases: include?.aliases ? (store.aliases.get(where.name) ?? []) : [],
          };
        },
        delete: async ({ where }: any) => {
          if (!store.players.has(where.name)) throw new Error('Not found');
          store.players.delete(where.name);
          for (const m of [store.affects, store.inventory, store.equipment, store.skills, store.aliases]) {
            m.delete(where.name);
          }
        },
        count: async ({ where }: any) => store.players.has(where.name) ? 1 : 0,
        findMany: async () => Array.from(store.players.values()).map((p: any) => ({ name: p.name })),
      },
      playerAffect: {
        deleteMany: async ({ where }: any) => { store.affects.delete(where.playerName); },
        create: async ({ data }: any) => {
          const entry = { id: `a_${++idCounter}`, ...data };
          const list = store.affects.get(data.playerName) ?? [];
          list.push(entry);
          store.affects.set(data.playerName, list);
          return entry;
        },
      },
      playerInventory: {
        deleteMany: async ({ where }: any) => { store.inventory.delete(where.playerName); },
        create: async ({ data }: any) => {
          const entry = { id: `i_${++idCounter}`, ...data };
          const list = store.inventory.get(data.playerName) ?? [];
          list.push(entry);
          store.inventory.set(data.playerName, list);
          return entry;
        },
      },
      playerEquipment: {
        deleteMany: async ({ where }: any) => { store.equipment.delete(where.playerName); },
        create: async ({ data }: any) => {
          const entry = { id: `e_${++idCounter}`, ...data };
          const list = store.equipment.get(data.playerName) ?? [];
          list.push(entry);
          store.equipment.set(data.playerName, list);
          return entry;
        },
      },
      playerSkill: {
        deleteMany: async ({ where }: any) => { store.skills.delete(where.playerName); },
        create: async ({ data }: any) => {
          const entry = { id: `s_${++idCounter}`, ...data };
          const list = store.skills.get(data.playerName) ?? [];
          list.push(entry);
          store.skills.set(data.playerName, list);
          return entry;
        },
      },
      playerAlias: {
        deleteMany: async ({ where }: any) => { store.aliases.delete(where.playerName); },
        create: async ({ data }: any) => {
          const entry = { id: `al_${++idCounter}`, ...data };
          const list = store.aliases.get(data.playerName) ?? [];
          list.push(entry);
          store.aliases.set(data.playerName, list);
          return entry;
        },
      },
    };

    repo = new PlayerRepository(prisma);
  });

  it('full save/load cycle preserves all player data', async () => {
    // Create a fully-kitted player
    const original = new Player({ name: 'Thorin', level: 25 });
    original.hit = 350;
    original.maxHit = 400;
    original.mana = 200;
    original.maxMana = 250;
    original.move = 180;
    original.maxMove = 200;
    original.gold = 5000;
    original.silver = 300;
    original.copper = 50;
    original.alignment = 500;
    original.armor = 60;
    original.hitroll = 12;
    original.damroll = 8;
    original.pcData.title = 'King Under the Mountain';
    original.pcData.clanName = 'Durin';
    original.pcData.favour = 100;

    // Add affects
    const sanctAffect = new Affect(10, 20, ApplyType.None, 0, AFF.SANCTUARY);
    const strAffect = new Affect(11, 15, ApplyType.Str, 3, 0n);
    original.affects.push(sanctAffect);
    original.affects.push(strAffect);

    // Add skills
    original.pcData.learned.set(1, 90);
    original.pcData.learned.set(5, 75);
    original.pcData.learned.set(10, 50);

    // Add aliases
    (original as any).aliases = new Map([
      ['bs', 'backstab'],
      ['fb', 'fireball'],
    ]);

    // Save
    await repo.save(original);

    // Load into fresh Player
    const loaded = await repo.load('Thorin');

    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Thorin');
    expect(loaded!.level).toBe(25);
    expect(loaded!.hit).toBe(350);
    expect(loaded!.maxHit).toBe(400);
    expect(loaded!.mana).toBe(200);
    expect(loaded!.gold).toBe(5000);
    expect(loaded!.silver).toBe(300);
    expect(loaded!.alignment).toBe(500);
    expect(loaded!.armor).toBe(60);
    expect(loaded!.hitroll).toBe(12);
    expect(loaded!.damroll).toBe(8);
    expect(loaded!.pcData.title).toBe('King Under the Mountain');
    expect(loaded!.pcData.clanName).toBe('Durin');
    expect(loaded!.pcData.favour).toBe(100);

    // Verify affects
    expect(loaded!.affects).toHaveLength(2);
    expect(loaded!.affects.some(a => a.type === 10)).toBe(true);
    expect(loaded!.affects.some(a => a.type === 11)).toBe(true);

    // Verify skills
    expect(loaded!.pcData.learned.get(1)).toBe(90);
    expect(loaded!.pcData.learned.get(5)).toBe(75);
    expect(loaded!.pcData.learned.get(10)).toBe(50);

    // Verify aliases
    const loadedAliases = (loaded as any).aliases as Map<string, string>;
    expect(loadedAliases.get('bs')).toBe('backstab');
    expect(loadedAliases.get('fb')).toBe('fireball');
  });

  it('delete removes all related data', async () => {
    const player = new Player({ name: 'Disposable', level: 1 });
    player.affects.push(new Affect(1, 5, ApplyType.Str, 1, 0n));
    player.pcData.learned.set(1, 50);
    await repo.save(player);

    expect(await repo.exists('Disposable')).toBe(true);

    const deleted = await repo.delete('Disposable');
    expect(deleted).toBe(true);
    expect(await repo.exists('Disposable')).toBe(false);
    expect(await repo.load('Disposable')).toBeNull();
  });

  it('save then modify then save preserves latest state', async () => {
    const player = new Player({ name: 'Evolving', level: 5 });
    player.gold = 100;
    await repo.save(player);

    // Modify
    player.level = 10;
    player.gold = 500;
    player.pcData.title = 'the Growing';
    await repo.save(player);

    const loaded = await repo.load('Evolving');
    expect(loaded!.level).toBe(10);
    expect(loaded!.gold).toBe(500);
    expect(loaded!.pcData.title).toBe('the Growing');
  });
});
