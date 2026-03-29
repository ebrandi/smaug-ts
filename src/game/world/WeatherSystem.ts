/**
 * WeatherSystem – Weather and time management for SMAUG 2.0
 *
 * Tracks in-game time (hour, day, month, year) and per-area weather
 * conditions (temperature, precipitation, wind, cloudCover).
 * Weather changes each full tick based on area climate and season.
 * Replicates legacy weather.c / time_info from SMAUG 2.0.
 *
 * Pulse-based: weatherUpdate() called every PULSE_TICK via EventBus.
 */

import type { Character } from '../entities/Character.js';
import type { Area } from '../entities/Area.js';
import type { Room } from '../entities/Room.js';
import type { AreaManager } from './AreaManager.js';
import { SectorType, Position } from '../entities/types.js';
import { Logger } from '../../utils/Logger.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { CommandLogLevel, defaultCommandFlags } from '../commands/CommandRegistry.js';

const LOG_DOMAIN = 'weather';

// =============================================================================
// Time Constants (legacy SMAUG 2.0)
// =============================================================================

/** Hours per game day. */
export const HOURS_PER_DAY = 24;
/** Days per game month. */
export const DAYS_PER_MONTH = 35;
/** Months per game year. */
export const MONTHS_PER_YEAR = 17;

/** Month names mirroring legacy SMAUG time_info. */
export const MONTH_NAMES: ReadonlyArray<string> = [
  'the Month of Winter',
  'the Month of the Winter Wolf',
  'the Month of the Frost Giant',
  'the Month of the Old Forces',
  'the Month of the Grand Struggle',
  'the Month of the Spring',
  'the Month of Nature',
  'the Month of Futility',
  'the Month of the Dragon',
  'the Month of the Sun',
  'the Month of the Heat',
  'the Month of the Battle',
  'the Month of the Dark Shades',
  'the Month of the Shadows',
  'the Month of the Long Shadows',
  'the Month of the Ancient Darkness',
  'the Month of the Great Evil',
];

/** Day names for the weekly cycle (7-day week). */
export const DAY_NAMES: ReadonlyArray<string> = [
  'the Moon', 'the Bull', 'Deception', 'Thunder',
  'Freedom', 'the Great Gods', 'the Sun',
];

/** Season classification based on month index. */
export enum Season {
  Winter = 0,
  Spring = 1,
  Summer = 2,
  Autumn = 3,
}

/**
 * Get the season for a given month index.
 * Months 0-3: Winter, 4-6: Spring, 7-10: Summer, 11-16: Autumn
 */
export function getSeason(month: number): Season {
  if (month <= 3) return Season.Winter;
  if (month <= 6) return Season.Spring;
  if (month <= 10) return Season.Summer;
  return Season.Autumn;
}

// =============================================================================
// Sky / Weather Description
// =============================================================================

/** Sky condition classification. */
export enum SkyCondition {
  Cloudless = 0,
  Cloudy = 1,
  Rainy = 2,
  Lightning = 3,
}

/**
 * Determine sky condition from precipitation and cloud cover values.
 */
export function getSkyCondition(precipitation: number, cloudCover: number): SkyCondition {
  if (precipitation > 60) return SkyCondition.Lightning;
  if (precipitation > 30) return SkyCondition.Rainy;
  if (cloudCover > 50) return SkyCondition.Cloudy;
  return SkyCondition.Cloudless;
}

/**
 * Get a human-readable sky condition string.
 */
export function skyString(sky: SkyCondition): string {
  switch (sky) {
    case SkyCondition.Cloudless: return 'cloudless';
    case SkyCondition.Cloudy:    return 'cloudy';
    case SkyCondition.Rainy:     return 'rainy';
    case SkyCondition.Lightning: return 'lit by flashes of lightning';
    default:                     return 'unknown';
  }
}

/**
 * Get a temperature description string.
 */
export function temperatureString(temp: number): string {
  if (temp < 0)   return 'frigid';
  if (temp < 20)  return 'cold';
  if (temp < 40)  return 'cool';
  if (temp < 60)  return 'mild';
  if (temp < 80)  return 'warm';
  if (temp < 100) return 'hot';
  return 'scorching';
}

/**
 * Get a wind description string.
 */
export function windString(wind: number): string {
  if (wind < 10)  return 'calm';
  if (wind < 25)  return 'breezy';
  if (wind < 50)  return 'windy';
  if (wind < 75)  return 'very windy';
  return 'a howling gale';
}

// =============================================================================
// Time State
// =============================================================================

/** In-game time of day state. */
export interface TimeInfo {
  hour: number;    // 0-23
  day: number;     // 0-34
  month: number;   // 0-16
  year: number;
}

/**
 * Determine if it is daytime (sunrise/day/sunset vs night).
 * Legacy SMAUG: sunrise 6-7, day 8-18, sunset 19-20, night 21-5.
 */
export function isSunUp(hour: number): boolean {
  return hour >= 6 && hour <= 20;
}

/** Get a period-of-day string. */
export function sunPosition(hour: number): string {
  if (hour >= 6 && hour < 8)   return 'sunrise';
  if (hour >= 8 && hour < 19)  return 'day';
  if (hour >= 19 && hour <= 20) return 'sunset';
  return 'night';
}

// =============================================================================
// WeatherSystem Class
// =============================================================================

/** Dependency-injection setters for module-level dependencies. */
let _areaManager: AreaManager | null = null;
let _eventBus: EventBus | null = null;
let _logger: Logger | null = null;

export function setWeatherAreaManager(am: AreaManager | null): void { _areaManager = am; }
export function setWeatherEventBus(eb: EventBus | null): void { _eventBus = eb; }
export function setWeatherLogger(l: Logger | null): void { _logger = l; }

/**
 * The global game time state. Mutable — advanced each full tick.
 */
export const timeInfo: TimeInfo = {
  hour: 0,
  day: 0,
  month: 0,
  year: 1,
};

/**
 * Initialize time to a specific state (e.g., from saved world state).
 */
export function initTime(hour: number, day: number, month: number, year: number): void {
  timeInfo.hour = hour % HOURS_PER_DAY;
  timeInfo.day = day % DAYS_PER_MONTH;
  timeInfo.month = month % MONTHS_PER_YEAR;
  timeInfo.year = year;
}

/**
 * Advance the in-game clock by one hour. Called each full tick.
 * Rolls over day/month/year as needed.
 */
export function advanceTime(): void {
  timeInfo.hour++;
  if (timeInfo.hour >= HOURS_PER_DAY) {
    timeInfo.hour = 0;
    timeInfo.day++;
    if (timeInfo.day >= DAYS_PER_MONTH) {
      timeInfo.day = 0;
      timeInfo.month++;
      if (timeInfo.month >= MONTHS_PER_YEAR) {
        timeInfo.month = 0;
        timeInfo.year++;
      }
    }
  }
}

/**
 * Update weather for a single area. Modifies the area's weather in-place.
 * Replicates legacy weather_update() logic:
 *  - Cloud cover drifts toward seasonal target ± random variation
 *  - Temperature adjusts based on season + time of day
 *  - Precipitation follows cloud cover
 *  - Wind varies randomly but trends toward seasonal norms
 */
export function updateAreaWeather(area: Area): void {
  const season = getSeason(timeInfo.month);
  const w = area.weather;

  // Seasonal base temperatures (Fahrenheit-ish, matching legacy)
  const seasonalTemp: Record<Season, number> = {
    [Season.Winter]: 20,
    [Season.Spring]: 50,
    [Season.Summer]: 80,
    [Season.Autumn]: 55,
  };

  // Seasonal cloud targets
  const seasonalCloud: Record<Season, number> = {
    [Season.Winter]: 60,
    [Season.Spring]: 40,
    [Season.Summer]: 20,
    [Season.Autumn]: 50,
  };

  // Seasonal wind targets
  const seasonalWind: Record<Season, number> = {
    [Season.Winter]: 40,
    [Season.Spring]: 25,
    [Season.Summer]: 15,
    [Season.Autumn]: 30,
  };

  // Drift cloud cover toward seasonal target
  const cloudTarget = seasonalCloud[season];
  const cloudDelta = Math.floor(Math.random() * 15) - 7; // -7 to +7
  const cloudDrift = w.cloudCover < cloudTarget ? 3 : w.cloudCover > cloudTarget ? -3 : 0;
  w.cloudCover = clamp(w.cloudCover + cloudDelta + cloudDrift, 0, 100);

  // Temperature: adjust toward seasonal base, + time-of-day modifier
  const tempTarget = seasonalTemp[season];
  const dayModifier = isSunUp(timeInfo.hour) ? 10 : -10;
  const tempDelta = Math.floor(Math.random() * 7) - 3; // -3 to +3
  const tempDrift = w.temperature < (tempTarget + dayModifier) ? 2 : -2;
  w.temperature = clamp(w.temperature + tempDelta + tempDrift, -20, 120);

  // Precipitation follows cloud cover
  if (w.cloudCover > 60) {
    const precipDelta = Math.floor(Math.random() * 10);
    w.precipitation = clamp(w.precipitation + precipDelta, 0, 100);
  } else if (w.cloudCover < 30) {
    w.precipitation = clamp(w.precipitation - Math.floor(Math.random() * 15), 0, 100);
  } else {
    const precipDelta = Math.floor(Math.random() * 7) - 3;
    w.precipitation = clamp(w.precipitation + precipDelta, 0, 100);
  }

  // Wind: drift toward seasonal target
  const windTarget = seasonalWind[season];
  const windDelta = Math.floor(Math.random() * 11) - 5; // -5 to +5
  const windDrift = w.windSpeed < windTarget ? 2 : w.windSpeed > windTarget ? -2 : 0;
  w.windSpeed = clamp(w.windSpeed + windDelta + windDrift, 0, 100);
}

/**
 * Full weather update cycle. Called each PULSE_TICK.
 * Advances time by one hour, updates weather for all areas, emits events.
 */
export function weatherUpdate(): void {
  const prevHour = timeInfo.hour;
  advanceTime();

  // Emit time change event
  _eventBus?.emitEvent(GameEvent.TimeChange, {
    hour: timeInfo.hour,
    day: timeInfo.day,
    month: timeInfo.month,
    year: timeInfo.year,
  });

  // Log sunrise/sunset transitions
  if (prevHour === 5 && timeInfo.hour === 6) {
    _logger?.info(LOG_DOMAIN, 'The sun rises in the east.');
  } else if (prevHour === 20 && timeInfo.hour === 21) {
    _logger?.info(LOG_DOMAIN, 'The sun slowly disappears in the west.');
  }

  // Update weather for all areas
  if (_areaManager) {
    for (const area of _areaManager.getAllAreas()) {
      updateAreaWeather(area);
    }
    _eventBus?.emitEvent(GameEvent.WeatherChange, { time: timeInfo });
  }
}

// =============================================================================
// Player Commands: time, weather
// =============================================================================

/**
 * doTime — Display the current in-game time and date.
 * Replicates legacy do_time().
 */
export function doTime(ch: Character, _argument: string): void {
  const dayOfWeek = timeInfo.day % 7;
  const dayName = DAY_NAMES[dayOfWeek] ?? 'Unknown';
  const monthName = MONTH_NAMES[timeInfo.month] ?? 'Unknown';
  const hourStr = timeInfo.hour < 12
    ? (timeInfo.hour === 0 ? '12am' : `${timeInfo.hour}am`)
    : (timeInfo.hour === 12 ? '12pm' : `${timeInfo.hour - 12}pm`);

  const sunPos = sunPosition(timeInfo.hour);
  let timeOfDayDesc: string;
  switch (sunPos) {
    case 'sunrise': timeOfDayDesc = 'The sun is rising in the east.'; break;
    case 'day':     timeOfDayDesc = 'The day has begun.'; break;
    case 'sunset':  timeOfDayDesc = 'The sun slowly disappears in the west.'; break;
    default:        timeOfDayDesc = 'The night has begun.'; break;
  }

  ch.sendToChar(
    `It is ${hourStr} on the Day of ${dayName}, ` +
    `day ${timeInfo.day + 1} of ${monthName}, year ${timeInfo.year}.\r\n`
  );
  ch.sendToChar(`${timeOfDayDesc}\r\n`);
}

/**
 * doWeather — Display the weather conditions in the character's current area.
 * Replicates legacy do_weather().
 */
export function doWeather(ch: Character, _argument: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar('You are nowhere.\r\n');
    return;
  }

  // Indoors or underground — can't see weather
  if (room.sectorType === SectorType.Inside ||
      room.sectorType === SectorType.Underground) {
    ch.sendToChar('You can\'t see the sky from here.\r\n');
    return;
  }

  const area = room.area;
  if (!area) {
    ch.sendToChar('You can\'t see the sky from here.\r\n');
    return;
  }

  const w = area.weather;
  const sky = getSkyCondition(w.precipitation, w.cloudCover);

  ch.sendToChar(`The sky is ${skyString(sky)} and the temperature is ${temperatureString(w.temperature)}.\r\n`);
  ch.sendToChar(`The wind is ${windString(w.windSpeed)}.\r\n`);

  // Add precipitation detail
  if (sky === SkyCondition.Rainy) {
    const season = getSeason(timeInfo.month);
    if (season === Season.Winter && w.temperature < 32) {
      ch.sendToChar('Snow is falling gently.\r\n');
    } else {
      ch.sendToChar('It is raining.\r\n');
    }
  } else if (sky === SkyCondition.Lightning) {
    ch.sendToChar('A thunderstorm rages overhead.\r\n');
  }
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register weather/time commands with the CommandRegistry.
 */
export function registerWeatherCommands(registry: import('../commands/CommandRegistry.js').CommandRegistry): void {
  registry.register({
    name: 'time',
    handler: doTime,
    minPosition: Position.Dead,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'weather',
    handler: doWeather,
    minPosition: Position.Resting,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });
}

// =============================================================================
// Utility
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
