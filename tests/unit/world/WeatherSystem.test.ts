import { describe, it, expect, beforeEach } from 'vitest';
import type { CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Area } from '../../../src/game/entities/Area.js';
import { SectorType, Position } from '../../../src/game/entities/types.js';
import {
  HOURS_PER_DAY,
  DAYS_PER_MONTH,
  MONTHS_PER_YEAR,
  MONTH_NAMES,
  DAY_NAMES,
  Season,
  getSeason,
  SkyCondition,
  getSkyCondition,
  skyString,
  temperatureString,
  windString,
  isSunUp,
  sunPosition,
  timeInfo,
  initTime,
  advanceTime,
  updateAreaWeather,
  weatherUpdate,
  doTime,
  doWeather,
  setWeatherAreaManager,
  setWeatherEventBus,
  setWeatherLogger,
  registerWeatherCommands,
} from '../../../src/game/world/WeatherSystem.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';
import { EventBus, GameEvent } from '../../../src/core/EventBus.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';

// =============================================================================
// Test Helpers
// =============================================================================

function makePlayer(overrides?: Partial<CharacterInit>): Player {
  const p = new Player({
    id: `test_${Math.random().toString(36).slice(2)}`,
    name: 'WeatherTester',
    level: 10,
    trust: 0,
    hit: 100, maxHit: 100,
    mana: 100, maxMana: 100,
    move: 100, maxMove: 100,
    position: Position.Standing,
    permStats: { str: 15, int: 15, wis: 15, dex: 15, con: 15, cha: 15, lck: 15 },
    ...overrides,
  });
  (p as any)._messages = [] as string[];
  p.sendToChar = (text: string) => { (p as any)._messages.push(text); };
  return p;
}

function getMessages(p: Player): string[] {
  return (p as any)._messages ?? [];
}

function clearMessages(p: Player): void {
  (p as any)._messages = [];
}

function makeArea(): Area {
  const a = new Area('test.are', 'Test Area', 'TestAuthor');
  a.vnumRanges.rooms = { low: 1000, high: 1099 };
  a.vnumRanges.mobiles = { low: 1000, high: 1099 };
  a.vnumRanges.objects = { low: 1000, high: 1099 };
  return a;
}

function placeInRoom(ch: Player, room: Room): void {
  room.addCharacter(ch);
}

// =============================================================================
// Tests: Time Constants
// =============================================================================

describe('WeatherSystem', () => {
  beforeEach(() => {
    initTime(0, 0, 0, 1); // Reset time to start
    setWeatherAreaManager(null);
    setWeatherEventBus(null);
    setWeatherLogger(null);
  });

  describe('Time Constants', () => {
    it('should have correct HOURS_PER_DAY', () => {
      expect(HOURS_PER_DAY).toBe(24);
    });

    it('should have correct DAYS_PER_MONTH', () => {
      expect(DAYS_PER_MONTH).toBe(35);
    });

    it('should have correct MONTHS_PER_YEAR', () => {
      expect(MONTHS_PER_YEAR).toBe(17);
    });

    it('should have 17 month names', () => {
      expect(MONTH_NAMES).toHaveLength(17);
    });

    it('should have 7 day names', () => {
      expect(DAY_NAMES).toHaveLength(7);
    });
  });

  // ===========================================================================
  // Season
  // ===========================================================================

  describe('getSeason', () => {
    it('should return Winter for months 0-3', () => {
      expect(getSeason(0)).toBe(Season.Winter);
      expect(getSeason(3)).toBe(Season.Winter);
    });

    it('should return Spring for months 4-6', () => {
      expect(getSeason(4)).toBe(Season.Spring);
      expect(getSeason(6)).toBe(Season.Spring);
    });

    it('should return Summer for months 7-10', () => {
      expect(getSeason(7)).toBe(Season.Summer);
      expect(getSeason(10)).toBe(Season.Summer);
    });

    it('should return Autumn for months 11-16', () => {
      expect(getSeason(11)).toBe(Season.Autumn);
      expect(getSeason(16)).toBe(Season.Autumn);
    });
  });

  // ===========================================================================
  // Sky Conditions
  // ===========================================================================

  describe('getSkyCondition', () => {
    it('should return Cloudless for low precipitation and cloud', () => {
      expect(getSkyCondition(0, 10)).toBe(SkyCondition.Cloudless);
    });

    it('should return Cloudy for high cloud cover', () => {
      expect(getSkyCondition(10, 60)).toBe(SkyCondition.Cloudy);
    });

    it('should return Rainy for moderate precipitation', () => {
      expect(getSkyCondition(40, 80)).toBe(SkyCondition.Rainy);
    });

    it('should return Lightning for high precipitation', () => {
      expect(getSkyCondition(70, 90)).toBe(SkyCondition.Lightning);
    });
  });

  describe('skyString', () => {
    it('should return descriptive strings for each condition', () => {
      expect(skyString(SkyCondition.Cloudless)).toBe('cloudless');
      expect(skyString(SkyCondition.Cloudy)).toBe('cloudy');
      expect(skyString(SkyCondition.Rainy)).toBe('rainy');
      expect(skyString(SkyCondition.Lightning)).toBe('lit by flashes of lightning');
    });
  });

  describe('temperatureString', () => {
    it('should return frigid for < 0', () => {
      expect(temperatureString(-5)).toBe('frigid');
    });
    it('should return cold for 0-19', () => {
      expect(temperatureString(10)).toBe('cold');
    });
    it('should return cool for 20-39', () => {
      expect(temperatureString(30)).toBe('cool');
    });
    it('should return mild for 40-59', () => {
      expect(temperatureString(50)).toBe('mild');
    });
    it('should return warm for 60-79', () => {
      expect(temperatureString(70)).toBe('warm');
    });
    it('should return hot for 80-99', () => {
      expect(temperatureString(90)).toBe('hot');
    });
    it('should return scorching for >= 100', () => {
      expect(temperatureString(110)).toBe('scorching');
    });
  });

  describe('windString', () => {
    it('should return calm for < 10', () => {
      expect(windString(5)).toBe('calm');
    });
    it('should return breezy for 10-24', () => {
      expect(windString(15)).toBe('breezy');
    });
    it('should return windy for 25-49', () => {
      expect(windString(35)).toBe('windy');
    });
    it('should return very windy for 50-74', () => {
      expect(windString(60)).toBe('very windy');
    });
    it('should return howling gale for >= 75', () => {
      expect(windString(80)).toBe('a howling gale');
    });
  });

  // ===========================================================================
  // Sun Position
  // ===========================================================================

  describe('isSunUp', () => {
    it('should return true during daytime hours (6-20)', () => {
      expect(isSunUp(6)).toBe(true);
      expect(isSunUp(12)).toBe(true);
      expect(isSunUp(20)).toBe(true);
    });

    it('should return false during nighttime hours', () => {
      expect(isSunUp(0)).toBe(false);
      expect(isSunUp(5)).toBe(false);
      expect(isSunUp(21)).toBe(false);
      expect(isSunUp(23)).toBe(false);
    });
  });

  describe('sunPosition', () => {
    it('should return sunrise for hours 6-7', () => {
      expect(sunPosition(6)).toBe('sunrise');
      expect(sunPosition(7)).toBe('sunrise');
    });

    it('should return day for hours 8-18', () => {
      expect(sunPosition(8)).toBe('day');
      expect(sunPosition(18)).toBe('day');
    });

    it('should return sunset for hours 19-20', () => {
      expect(sunPosition(19)).toBe('sunset');
      expect(sunPosition(20)).toBe('sunset');
    });

    it('should return night for other hours', () => {
      expect(sunPosition(0)).toBe('night');
      expect(sunPosition(5)).toBe('night');
      expect(sunPosition(21)).toBe('night');
      expect(sunPosition(23)).toBe('night');
    });
  });

  // ===========================================================================
  // Time Advancement
  // ===========================================================================

  describe('initTime', () => {
    it('should set time correctly', () => {
      initTime(12, 15, 5, 42);
      expect(timeInfo.hour).toBe(12);
      expect(timeInfo.day).toBe(15);
      expect(timeInfo.month).toBe(5);
      expect(timeInfo.year).toBe(42);
    });

    it('should wrap values that exceed maximums', () => {
      initTime(30, 40, 20, 1);
      expect(timeInfo.hour).toBe(30 % HOURS_PER_DAY);
      expect(timeInfo.day).toBe(40 % DAYS_PER_MONTH);
      expect(timeInfo.month).toBe(20 % MONTHS_PER_YEAR);
    });
  });

  describe('advanceTime', () => {
    it('should advance hour by 1', () => {
      initTime(10, 0, 0, 1);
      advanceTime();
      expect(timeInfo.hour).toBe(11);
    });

    it('should roll over day at hour 24', () => {
      initTime(23, 0, 0, 1);
      advanceTime();
      expect(timeInfo.hour).toBe(0);
      expect(timeInfo.day).toBe(1);
    });

    it('should roll over month at day 35', () => {
      initTime(23, 34, 0, 1);
      advanceTime();
      expect(timeInfo.hour).toBe(0);
      expect(timeInfo.day).toBe(0);
      expect(timeInfo.month).toBe(1);
    });

    it('should roll over year at month 17', () => {
      initTime(23, 34, 16, 1);
      advanceTime();
      expect(timeInfo.hour).toBe(0);
      expect(timeInfo.day).toBe(0);
      expect(timeInfo.month).toBe(0);
      expect(timeInfo.year).toBe(2);
    });

    it('should not change day/month/year on normal advance', () => {
      initTime(5, 10, 3, 5);
      advanceTime();
      expect(timeInfo.hour).toBe(6);
      expect(timeInfo.day).toBe(10);
      expect(timeInfo.month).toBe(3);
      expect(timeInfo.year).toBe(5);
    });
  });

  // ===========================================================================
  // Area Weather Update
  // ===========================================================================

  describe('updateAreaWeather', () => {
    it('should modify area weather values', () => {
      const area = makeArea();
      const original = { ...area.weather };
      // Run multiple times to ensure at least some change
      for (let i = 0; i < 20; i++) {
        updateAreaWeather(area);
      }
      // After many updates, at least one value should have changed
      const changed =
        area.weather.cloudCover !== original.cloudCover ||
        area.weather.temperature !== original.temperature ||
        area.weather.windSpeed !== original.windSpeed ||
        area.weather.precipitation !== original.precipitation;
      expect(changed).toBe(true);
    });

    it('should keep values within valid ranges (0-100 or -20 to 120)', () => {
      const area = makeArea();
      for (let i = 0; i < 100; i++) {
        updateAreaWeather(area);
      }
      expect(area.weather.cloudCover).toBeGreaterThanOrEqual(0);
      expect(area.weather.cloudCover).toBeLessThanOrEqual(100);
      expect(area.weather.temperature).toBeGreaterThanOrEqual(-20);
      expect(area.weather.temperature).toBeLessThanOrEqual(120);
      expect(area.weather.windSpeed).toBeGreaterThanOrEqual(0);
      expect(area.weather.windSpeed).toBeLessThanOrEqual(100);
      expect(area.weather.precipitation).toBeGreaterThanOrEqual(0);
      expect(area.weather.precipitation).toBeLessThanOrEqual(100);
    });
  });

  // ===========================================================================
  // weatherUpdate (full tick)
  // ===========================================================================

  describe('weatherUpdate', () => {
    it('should advance time by one hour', () => {
      initTime(10, 5, 3, 1);
      weatherUpdate();
      expect(timeInfo.hour).toBe(11);
    });

    it('should emit TimeChange event when EventBus is set', () => {
      const bus = new EventBus();
      setWeatherEventBus(bus);
      let emitted = false;
      bus.on(GameEvent.TimeChange, () => { emitted = true; });
      weatherUpdate();
      expect(emitted).toBe(true);
      setWeatherEventBus(null);
    });

    it('should emit WeatherChange event when area manager is set', () => {
      const bus = new EventBus();
      const mockAreaManager = {
        getAllAreas: () => [makeArea()],
      } as any;
      setWeatherEventBus(bus);
      setWeatherAreaManager(mockAreaManager);
      let emitted = false;
      bus.on(GameEvent.WeatherChange, () => { emitted = true; });
      weatherUpdate();
      expect(emitted).toBe(true);
      setWeatherEventBus(null);
      setWeatherAreaManager(null);
    });
  });

  // ===========================================================================
  // doTime command
  // ===========================================================================

  describe('doTime', () => {
    it('should display the current time and sun position', () => {
      initTime(12, 5, 3, 10);
      const ch = makePlayer();
      doTime(ch, '');
      const msgs = getMessages(ch);
      expect(msgs.length).toBeGreaterThanOrEqual(2);
      expect(msgs[0]).toContain('12pm');
      expect(msgs[0]).toContain('day 6');
      expect(msgs[0]).toContain('year 10');
      expect(msgs[1]).toContain('day has begun');
    });

    it('should show sunrise message at hour 6', () => {
      initTime(6, 0, 0, 1);
      const ch = makePlayer();
      doTime(ch, '');
      const msgs = getMessages(ch);
      expect(msgs[1]).toContain('rising');
    });

    it('should show night message at hour 0', () => {
      initTime(0, 0, 0, 1);
      const ch = makePlayer();
      doTime(ch, '');
      const msgs = getMessages(ch);
      expect(msgs[0]).toContain('12am');
      expect(msgs[1]).toContain('night');
    });

    it('should show correct AM hours', () => {
      initTime(9, 0, 0, 1);
      const ch = makePlayer();
      doTime(ch, '');
      expect(getMessages(ch)[0]).toContain('9am');
    });

    it('should show correct PM hours', () => {
      initTime(15, 0, 0, 1);
      const ch = makePlayer();
      doTime(ch, '');
      expect(getMessages(ch)[0]).toContain('3pm');
    });
  });

  // ===========================================================================
  // doWeather command
  // ===========================================================================

  describe('doWeather', () => {
    it('should show weather when outdoors', () => {
      const ch = makePlayer();
      const area = makeArea();
      const room = new Room(1000, 'Field', 'A grassy field.');
      room.sectorType = SectorType.Field;
      room.area = area;
      area.weather.cloudCover = 10;
      area.weather.precipitation = 5;
      area.weather.temperature = 70;
      area.weather.windSpeed = 15;
      placeInRoom(ch, room);

      doWeather(ch, '');
      const msgs = getMessages(ch);
      expect(msgs.length).toBeGreaterThanOrEqual(2);
      expect(msgs[0]).toContain('cloudless');
      expect(msgs[0]).toContain('warm');
      expect(msgs[1]).toContain('breezy');
    });

    it('should show rain/snow details', () => {
      const ch = makePlayer();
      const area = makeArea();
      const room = new Room(1000, 'Plain', 'A plain.');
      room.sectorType = SectorType.Field;
      room.area = area;
      area.weather.cloudCover = 80;
      area.weather.precipitation = 40;
      area.weather.temperature = 50;
      area.weather.windSpeed = 5;
      placeInRoom(ch, room);

      doWeather(ch, '');
      const msgs = getMessages(ch);
      expect(msgs.some(m => m.includes('raining'))).toBe(true);
    });

    it('should show thunderstorm for high precipitation', () => {
      const ch = makePlayer();
      const area = makeArea();
      const room = new Room(1000, 'Storm', 'A stormy place.');
      room.sectorType = SectorType.Field;
      room.area = area;
      area.weather.cloudCover = 90;
      area.weather.precipitation = 80;
      area.weather.temperature = 50;
      area.weather.windSpeed = 60;
      placeInRoom(ch, room);

      doWeather(ch, '');
      const msgs = getMessages(ch);
      expect(msgs.some(m => m.includes('thunderstorm'))).toBe(true);
    });

    it('should show snow when rainy + winter + cold', () => {
      initTime(0, 0, 0, 1); // month 0 = winter
      const ch = makePlayer();
      const area = makeArea();
      const room = new Room(1000, 'Tundra', 'Cold land.');
      room.sectorType = SectorType.Field;
      room.area = area;
      area.weather.cloudCover = 70;
      area.weather.precipitation = 40;
      area.weather.temperature = 20; // below 32 (freezing)
      area.weather.windSpeed = 20;
      placeInRoom(ch, room);

      doWeather(ch, '');
      const msgs = getMessages(ch);
      expect(msgs.some(m => m.includes('Snow'))).toBe(true);
    });

    it('should block weather when indoors', () => {
      const ch = makePlayer();
      const room = new Room(1000, 'Inside', 'An indoor room.');
      room.sectorType = SectorType.Inside;
      room.area = makeArea();
      placeInRoom(ch, room);

      doWeather(ch, '');
      const msgs = getMessages(ch);
      expect(msgs[0]).toContain("can't see the sky");
    });

    it('should block weather when underground', () => {
      const ch = makePlayer();
      const room = new Room(1000, 'Cave', 'An underground cave.');
      room.sectorType = SectorType.Underground;
      room.area = makeArea();
      placeInRoom(ch, room);

      doWeather(ch, '');
      const msgs = getMessages(ch);
      expect(msgs[0]).toContain("can't see the sky");
    });

    it('should handle no room gracefully', () => {
      const ch = makePlayer();
      doWeather(ch, '');
      expect(getMessages(ch)[0]).toContain('nowhere');
    });

    it('should handle room with no area', () => {
      const ch = makePlayer();
      const room = new Room(1000, 'Void', 'No area.');
      room.sectorType = SectorType.Field;
      placeInRoom(ch, room);

      doWeather(ch, '');
      expect(getMessages(ch)[0]).toContain("can't see the sky");
    });
  });

  // ===========================================================================
  // Command Registration
  // ===========================================================================

  describe('registerWeatherCommands', () => {
    it('should register time and weather commands', () => {
      const logger = new Logger(LogLevel.Error);
      const registry = new CommandRegistry(logger);
      registerWeatherCommands(registry);

      // Check by trying to find the commands
      const ch = makePlayer();
      const room = new Room(1000, 'Test', 'A test room.');
      room.sectorType = SectorType.Field;
      room.area = makeArea();
      placeInRoom(ch, room);

      initTime(12, 0, 0, 1);
      registry.dispatch(ch, 'time');
      expect(getMessages(ch).length).toBeGreaterThan(0);
      expect(getMessages(ch).some(m => m.includes('12pm'))).toBe(true);
    });
  });
});
