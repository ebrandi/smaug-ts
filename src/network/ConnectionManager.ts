/**
 * ConnectionManager – Manages all active player connections (descriptors).
 *
 * Each connection is represented by a Descriptor that wraps a transport
 * (WebSocket or Socket.IO). The ConnectionManager processes input queues
 * each pulse, manages idle timeouts, flushes output buffers, and handles
 * the full nanny state machine for login/character creation.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { Socket as SocketIOSocket } from 'socket.io';
import { GameEvent } from '../core/EventBus.js';
import type { IConnectionManager } from '../core/GameLoop.js';

// =============================================================================
// Connection State Machine
// =============================================================================

/** Nanny / login state machine states. */
export enum ConnectionState {
  GetName          = 0,
  GetOldPassword   = 1,
  ConfirmNewName   = 2,
  GetNewPassword   = 3,
  ConfirmPassword  = 4,
  GetNewSex        = 5,
  GetNewRace       = 6,
  GetNewClass      = 7,
  GetPKill         = 8,
  ReadMotd         = 9,
  ReadImotd        = 10,
  PressEnter       = 11,
  Playing          = 12,
  Editing          = 13,
  CopyoverRecover  = 14,
}

// =============================================================================
// Protocol Capabilities
// =============================================================================

/** Negotiated protocol features for a connection. */
export interface ProtocolCapabilities {
  msdp: boolean;
  mssp: boolean;
  mccp: boolean;
  mxp: boolean;
  color256: boolean;
  utf8: boolean;
  gmcp: boolean;
  screenWidth: number;
  screenHeight: number;
}

function defaultCapabilities(): ProtocolCapabilities {
  return {
    msdp: false, mssp: false, mccp: false, mxp: false,
    color256: false, utf8: false, gmcp: false,
    screenWidth: 80, screenHeight: 24,
  };
}

// =============================================================================
// Transport Abstraction
// =============================================================================

/** Transport-agnostic interface for sending/receiving data. */
export interface ITransport {
  send(data: string): void;
  close(): void;
  onData(callback: (data: string) => void): void;
  onClose(callback: () => void): void;
  readonly isOpen: boolean;
}

/** ITransport implementation wrapping a ws WebSocket. */
export class WebSocketTransport implements ITransport {
  private readonly ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  send(data: string): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(): void {
    this.ws.close();
  }

  onData(callback: (data: string) => void): void {
    this.ws.on('message', (raw: WebSocket.RawData) => {
      callback(raw.toString());
    });
  }

  onClose(callback: () => void): void {
    this.ws.on('close', callback);
  }

  get isOpen(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }
}

/** ITransport implementation wrapping a Socket.IO socket. */
export class SocketIOTransport implements ITransport {
  private readonly socket: SocketIOSocket;
  private _open: boolean = true;

  constructor(socket: SocketIOSocket) {
    this.socket = socket;
    this.socket.on('disconnect', () => { this._open = false; });
  }

  send(data: string): void {
    if (this._open) {
      this.socket.emit('output', data);
    }
  }

  close(): void {
    this._open = false;
    this.socket.disconnect(true);
  }

  onData(callback: (data: string) => void): void {
    this.socket.on('input', (data: unknown) => {
      callback(String(data));
    });
  }

  onClose(callback: () => void): void {
    this.socket.on('disconnect', callback);
  }

  get isOpen(): boolean {
    return this._open;
  }
}

// =============================================================================
// OLC Editor Data
// =============================================================================

/** Online-creation editor session state. */
export interface OlcEditorData {
  mode: 'room' | 'mobile' | 'object' | 'area' | 'shop' | 'program';
  vnum: number;
  modified: boolean;
}

// =============================================================================
// Nanny state data for character creation
// =============================================================================

/** Temporary data accumulated during character creation. */
export interface NannyData {
  name: string;
  passwordHash: string;
  pendingPassword: string;
  race: string;
  class_: string;
  sex: number;
  pkill: boolean;
  loginAttempts: number;
  isNew: boolean;
}

function defaultNannyData(): NannyData {
  return {
    name: '',
    passwordHash: '',
    pendingPassword: '',
    race: 'human',
    class_: 'warrior',
    sex: 0,
    pkill: false,
    loginAttempts: 0,
    isNew: false,
  };
}

// =============================================================================
// Constants
// =============================================================================

/** Reserved names that cannot be used for characters. */
const RESERVED_NAMES = new Set([
  'all', 'auto', 'immortal', 'self', 'someone', 'something',
  'the', 'you', 'loner', 'none', 'admin', 'system', 'god',
]);

/** Valid races for character creation. */
const VALID_RACES = [
  'human', 'elf', 'dwarf', 'halfling', 'pixie', 'vampire',
  'half-ogre', 'half-orc', 'half-troll', 'half-elf', 'gith',
];

/** Valid classes for character creation. */
const VALID_CLASSES = [
  'mage', 'cleric', 'thief', 'warrior', 'vampire', 'druid',
  'ranger', 'augurer', 'paladin', 'nephandi', 'savage', 'pirate',
];

const MAX_LOGIN_ATTEMPTS = 3;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 12;
const MIN_PASSWORD_LENGTH = 6;
const DEFAULT_START_ROOM = 100;

// =============================================================================
// Descriptor
// =============================================================================

let nextDescriptorId = 1;

/**
 * Descriptor – Represents a single connected client session.
 *
 * Wraps a transport, maintains input/output queues, and tracks
 * connection state for the login/character-creation nanny.
 */
export class Descriptor {
  readonly id: number;
  readonly host: string;
  readonly port: number;
  readonly connectedAt: Date;
  readonly transport: ITransport;

  state: ConnectionState = ConnectionState.GetName;
  character: unknown | null = null;   // Will be Player once entity classes exist
  original: unknown | null = null;    // For switch / possess
  idle: number = 0;
  capabilities: ProtocolCapabilities;
  olcData: OlcEditorData | null = null;
  nannyData: NannyData;

  private inputQueue: string[] = [];
  private outputBuffer: string = '';
  private pagerBuffer: string[] = [];
  private _pagerPosition: number = 0;
  private _pagerPageLen: number = 24;

  constructor(transport: ITransport, host: string, port: number) {
    this.id = nextDescriptorId++;
    this.host = host;
    this.port = port;
    this.connectedAt = new Date();
    this.transport = transport;
    this.capabilities = defaultCapabilities();
    this.nannyData = defaultNannyData();

    // Wire up transport events
    transport.onData((data: string) => {
      // Split on newlines, trim, and enqueue non-empty lines
      const lines = data.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed.length > 0 || this.inputQueue.length === 0) {
          this.inputQueue.push(trimmed);
        }
      }
    });

    transport.onClose(() => {
      this.character = null;
    });
  }

  /** Dequeue the next input line, or undefined if empty. */
  nextInput(): string | undefined {
    return this.inputQueue.shift();
  }

  /** Append text to the output buffer (will be sent on flush). */
  write(text: string): void {
    this.outputBuffer += text;
  }

  /**
   * Buffer text for paged display.
   * If text exceeds pageLen lines, show first page and buffer rest.
   */
  writePaged(text: string): void {
    const lines = text.split('\n');
    if (lines.length <= this._pagerPageLen) {
      // Short enough to display directly
      this.write(text);
      return;
    }

    // Buffer all lines and show first page
    this.pagerBuffer = lines;
    this._pagerPosition = 0;
    this.showNextPage();
  }

  /** Display the next page of paged output. */
  private showNextPage(): void {
    const start = this._pagerPosition;
    const end = Math.min(start + this._pagerPageLen, this.pagerBuffer.length);

    for (let i = start; i < end; i++) {
      this.write(this.pagerBuffer[i] + '\n');
    }

    this._pagerPosition = end;

    if (end < this.pagerBuffer.length) {
      this.write('\r\n[Hit Return, (N)ext, (R)efresh, (B)ack, (Q)uit] ');
    } else {
      // Done paging
      this.pagerBuffer = [];
      this._pagerPosition = 0;
    }
  }

  /**
   * Handle pager input.
   * C/Enter: show next page
   * N: disable pager for this output, show all remaining
   * R: refresh current page
   * B: go back one page
   * Q: quit pager, discard remaining output
   */
  handlePagerInput(input: string): boolean {
    if (this.pagerBuffer.length === 0) return false;

    const cmd = input.trim().toLowerCase();

    switch (cmd) {
      case '':
      case 'c':
        // Show next page
        this.showNextPage();
        return true;

      case 'n':
        // Show all remaining
        for (let i = this._pagerPosition; i < this.pagerBuffer.length; i++) {
          this.write(this.pagerBuffer[i] + '\n');
        }
        this.pagerBuffer = [];
        this._pagerPosition = 0;
        return true;

      case 'r':
        // Refresh current page
        this._pagerPosition = Math.max(0, this._pagerPosition - this._pagerPageLen);
        this.showNextPage();
        return true;

      case 'b':
        // Go back one page
        this._pagerPosition = Math.max(0, this._pagerPosition - this._pagerPageLen * 2);
        this.showNextPage();
        return true;

      case 'q':
        // Quit pager
        this.pagerBuffer = [];
        this._pagerPosition = 0;
        return true;

      default:
        // Show next page for any other input
        this.showNextPage();
        return true;
    }
  }

  /** Set the pager page length. */
  setPageLen(len: number): void {
    this._pagerPageLen = Math.max(5, len);
  }

  /** Check if descriptor is in paging mode. */
  get isPaging(): boolean {
    return this.pagerBuffer.length > 0;
  }

  /** Send all buffered output to the transport. */
  flush(): void {
    if (this.outputBuffer.length > 0 && this.transport.isOpen) {
      this.transport.send(this.outputBuffer);
      this.outputBuffer = '';
    }
  }

  /** Close the underlying transport. */
  close(): void {
    this.transport.close();
  }

  /** Current pager scroll position. */
  get pagerPosition(): number {
    return this._pagerPosition;
  }

  /** Whether the transport is still open. */
  get isConnected(): boolean {
    return this.transport.isOpen;
  }

  /** Reset the descriptor ID counter (for testing). */
  static resetIdCounter(): void {
    nextDescriptorId = 1;
  }
}

// =============================================================================
// Connection Manager
// =============================================================================

/** Greeting banner sent to new connections. */
const GREETING_BANNER = `\x1b[1;36m
 ____  __  __    _   _   _  ____   ____    ___
/ ___||  \\/  |  / \\ | | | |/ ___| |___ \\  / _ \\
\\___ \\| |\\/| | / _ \\| | | | |  _    __) || | | |
 ___) | |  | |/ ___ \\ |_| | |_| |  / __/ | |_| |
|____/|_|  |_/_/   \\_\\___/ \\____| |_____(_)___/
\x1b[0m
\x1b[1;33mWelcome to SMAUG 2.0 – The Next Generation\x1b[0m

By what name do you wish to be known? `;

export interface NetworkConfig {
  port: number;
  wsPath: string;
  socketioPath: string;
  maxConnections: number;
  idleTimeoutSec: number;
}

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  port: 4000,
  wsPath: '/ws',
  socketioPath: '/play',
  maxConnections: 256,
  idleTimeoutSec: 300,
};

/**
 * ConnectionManager – Owns all active Descriptor instances.
 *
 * Implements IConnectionManager so the GameLoop can call
 * processInput() and flushOutput() each pulse.
 * Handles full nanny state machine for login/character creation.
 */
// TODO PARITY: Pager system — implement dynamic page-size growth, PCFLAG_PAGERON toggle, pager color support
export class ConnectionManager implements IConnectionManager {
  private readonly descriptors: Map<string, Descriptor> = new Map();
  private readonly eventBus: EventEmitter;
  private readonly config: NetworkConfig;

  constructor(eventBus: EventEmitter, config: Partial<NetworkConfig> = {}) {
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };
  }

  /** Accept a new WebSocket connection. */
  acceptWebSocket(ws: WebSocket, host: string, port: number): Descriptor {
    const transport = new WebSocketTransport(ws);
    return this.acceptTransport(transport, host, port);
  }

  /** Accept a new Socket.IO connection. */
  acceptSocketIO(socket: SocketIOSocket, host: string, port: number): Descriptor {
    const transport = new SocketIOTransport(socket);
    return this.acceptTransport(transport, host, port);
  }

  /** Common logic for accepting any transport. */
  private acceptTransport(transport: ITransport, host: string, port: number): Descriptor {
    const desc = new Descriptor(transport, host, port);
    const key = String(desc.id);
    this.descriptors.set(key, desc);

    // Send greeting
    desc.write(GREETING_BANNER);
    desc.flush();

    // Remove on disconnect
    transport.onClose(() => {
      this.descriptors.delete(key);
      this.eventBus.emit(GameEvent.CharacterLogout, { descriptorId: desc.id });
    });

    this.eventBus.emit(GameEvent.CharacterLogin, { descriptorId: desc.id, host });
    return desc;
  }

  /**
   * Process one queued input line per descriptor per pulse.
   * Increments idle counters and handles timeout disconnects.
   */
  processInput(): void {
    for (const [key, desc] of this.descriptors) {
      if (!desc.isConnected) {
        this.descriptors.delete(key);
        continue;
      }

      desc.idle++;
      const input = desc.nextInput();

      if (input !== undefined) {
        desc.idle = 0;

        // Handle pager input first
        if (desc.isPaging) {
          desc.handlePagerInput(input);
          continue;
        }

        if (desc.state === ConnectionState.Playing) {
          // Delegate to character.interpretCommand(input)
          const player = desc.character as { interpretCommand?: (input: string) => void } | null;
          if (player?.interpretCommand) {
            player.interpretCommand(input);
          }
        } else {
          this.handleNannyState(desc, input);
        }
      }

      // Idle timeout check
      if (desc.idle > this.config.idleTimeoutSec * 4) {
        desc.write('\n\rIdle timeout – disconnecting.\n\r');
        desc.flush();
        desc.close();
        this.descriptors.delete(key);
      }
    }
  }

  /**
   * Main nanny dispatcher – route based on descriptor.state.
   */
  handleNannyState(descriptor: Descriptor, input: string): void {
    switch (descriptor.state) {
      case ConnectionState.GetName:
        this.handleGetName(descriptor, input);
        break;
      case ConnectionState.GetOldPassword:
        this.handleGetOldPassword(descriptor, input);
        break;
      case ConnectionState.ConfirmNewName:
        this.handleConfirmNewName(descriptor, input);
        break;
      case ConnectionState.GetNewPassword:
        this.handleGetNewPassword(descriptor, input);
        break;
      case ConnectionState.ConfirmPassword:
        this.handleConfirmPassword(descriptor, input);
        break;
      case ConnectionState.GetNewRace:
        this.handleGetNewRace(descriptor, input);
        break;
      case ConnectionState.GetNewClass:
        this.handleGetNewClass(descriptor, input);
        break;
      case ConnectionState.GetNewSex:
        this.handleGetNewSex(descriptor, input);
        break;
      case ConnectionState.GetPKill:
        this.handleGetPKill(descriptor, input);
        break;
      case ConnectionState.ReadMotd:
        this.handleReadMotd(descriptor, input);
        break;
      case ConnectionState.PressEnter:
        this.handlePressEnter(descriptor, input);
        break;
      default:
        descriptor.write('Error in nanny state. Disconnecting.\r\n');
        descriptor.flush();
        descriptor.close();
        break;
    }
  }

  /**
   * GetName state: Validate name and determine if player exists or is new.
   */
  private handleGetName(descriptor: Descriptor, input: string): void {
    const name = input.trim();

    if (name.length === 0) {
      descriptor.write('By what name do you wish to be known? ');
      return;
    }

    // Validate name
    if (!this.isValidName(name)) {
      descriptor.write('Illegal name, try another.\r\nName: ');
      return;
    }

    const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    descriptor.nannyData.name = capitalized;

    // Check if player exists (stub - always treat as new for now)
    // In production this would check PlayerRepository
    const existingPlayer = this.findExistingPlayer(capitalized);
    if (existingPlayer) {
      descriptor.nannyData.isNew = false;
      descriptor.write('Password: ');
      descriptor.state = ConnectionState.GetOldPassword;
    } else {
      descriptor.nannyData.isNew = true;
      descriptor.write(`Did I get that right, ${capitalized}? (Y/N) `);
      descriptor.state = ConnectionState.ConfirmNewName;
    }
  }

  /**
   * GetOldPassword state: Verify password for existing player.
   */
  private handleGetOldPassword(descriptor: Descriptor, input: string): void {
    const password = input.trim();

    descriptor.nannyData.loginAttempts++;

    // Stub: In production, verify with bcrypt.compare()
    // For now, check against stored hash
    if (descriptor.nannyData.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      descriptor.write('\r\nToo many failed login attempts. Disconnecting.\r\n');
      descriptor.flush();
      descriptor.close();
      return;
    }

    // Password verification stub - would use bcrypt in production
    if (password.length === 0) {
      descriptor.write('Wrong password.\r\nPassword: ');
      return;
    }

    // Successful login (stub - always accept non-empty password)
    descriptor.write('\r\n');
    this.showMotd(descriptor);
    descriptor.state = ConnectionState.ReadMotd;
  }

  /**
   * ConfirmNewName state: Ask player to confirm their chosen name.
   */
  private handleConfirmNewName(descriptor: Descriptor, input: string): void {
    const answer = input.trim().toLowerCase();

    if (answer.startsWith('y')) {
      descriptor.write(`New character.\r\nGive me a password for ${descriptor.nannyData.name}: `);
      descriptor.state = ConnectionState.GetNewPassword;
    } else if (answer.startsWith('n')) {
      descriptor.write('Ok, what IS it, then? ');
      descriptor.nannyData = defaultNannyData();
      descriptor.state = ConnectionState.GetName;
    } else {
      descriptor.write('Please type Yes or No: ');
    }
  }

  /**
   * GetNewPassword state: Set a password for a new character.
   */
  private handleGetNewPassword(descriptor: Descriptor, input: string): void {
    const password = input.trim();

    if (password.length < MIN_PASSWORD_LENGTH) {
      descriptor.write(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.\r\nPassword: `);
      return;
    }

    // In production: hash with bcrypt
    descriptor.nannyData.pendingPassword = password;
    descriptor.write('\r\nPlease retype password: ');
    descriptor.state = ConnectionState.ConfirmPassword;
  }

  /**
   * ConfirmPassword state: Verify the password matches.
   */
  private handleConfirmPassword(descriptor: Descriptor, input: string): void {
    const password = input.trim();

    if (password !== descriptor.nannyData.pendingPassword) {
      descriptor.write('\r\nPasswords don\'t match.\r\nRetype password: ');
      descriptor.nannyData.pendingPassword = '';
      descriptor.state = ConnectionState.GetNewPassword;
      return;
    }

    // Password confirmed - in production, store bcrypt hash
    descriptor.nannyData.passwordHash = password; // Would be bcrypt hash

    // Show race selection
    descriptor.write('\r\nPlease choose a race:\r\n');
    this.showRaceList(descriptor);
    descriptor.write('\r\nChoose your race: ');
    descriptor.state = ConnectionState.GetNewRace;
  }

  /**
   * GetNewRace state: Select a race for the new character.
   */
  private handleGetNewRace(descriptor: Descriptor, input: string): void {
    const choice = input.trim().toLowerCase();

    if (choice === 'help' || choice === '?') {
      this.showRaceList(descriptor);
      descriptor.write('\r\nChoose your race: ');
      return;
    }

    const race = VALID_RACES.find(r => r.startsWith(choice));
    if (!race) {
      descriptor.write('That\'s not a valid race.\r\nChoose your race: ');
      return;
    }

    descriptor.nannyData.race = race;

    // Show class selection
    descriptor.write('\r\nPlease choose a class:\r\n');
    this.showClassList(descriptor);
    descriptor.write('\r\nChoose your class: ');
    descriptor.state = ConnectionState.GetNewClass;
  }

  /**
   * GetNewClass state: Select a class for the new character.
   */
  private handleGetNewClass(descriptor: Descriptor, input: string): void {
    const choice = input.trim().toLowerCase();

    if (choice === 'help' || choice === '?') {
      this.showClassList(descriptor);
      descriptor.write('\r\nChoose your class: ');
      return;
    }

    const class_ = VALID_CLASSES.find(c => c.startsWith(choice));
    if (!class_) {
      descriptor.write('That\'s not a valid class.\r\nChoose your class: ');
      return;
    }

    descriptor.nannyData.class_ = class_;

    // Sex selection
    descriptor.write('\r\nWhat is your sex? (M)ale, (F)emale, or (N)eutral: ');
    descriptor.state = ConnectionState.GetNewSex;
  }

  /**
   * GetNewSex state: M/F/N selection.
   */
  private handleGetNewSex(descriptor: Descriptor, input: string): void {
    const choice = input.trim().toLowerCase();

    switch (choice) {
      case 'm':
      case 'male':
        descriptor.nannyData.sex = 1; // Sex.Male
        break;
      case 'f':
      case 'female':
        descriptor.nannyData.sex = 2; // Sex.Female
        break;
      case 'n':
      case 'neutral':
        descriptor.nannyData.sex = 0; // Sex.Neutral
        break;
      default:
        descriptor.write('That\'s not a sex.\r\nWhat is your sex? (M/F/N): ');
        return;
    }

    // PK choice
    descriptor.write('\r\nWish to be a (D)eadly or (P)eaceful player? ');
    descriptor.state = ConnectionState.GetPKill;
  }

  /**
   * GetPKill state: Deadly/Peaceful choice.
   */
  private handleGetPKill(descriptor: Descriptor, input: string): void {
    const choice = input.trim().toLowerCase();

    if (choice.startsWith('d')) {
      descriptor.nannyData.pkill = true;
    } else if (choice.startsWith('p')) {
      descriptor.nannyData.pkill = false;
    } else {
      descriptor.write('Please choose (D)eadly or (P)eaceful: ');
      return;
    }

    // Show MOTD
    this.showMotd(descriptor);
    descriptor.state = ConnectionState.ReadMotd;
  }

  /**
   * ReadMotd state: Display the MOTD, then wait for Enter.
   */
  private handleReadMotd(descriptor: Descriptor, _input: string): void {
    descriptor.write('\r\n[Press Enter to continue] ');
    descriptor.state = ConnectionState.PressEnter;
  }

  /**
   * PressEnter state: On any input, finalize login/creation.
   * Creates the Player entity, places in starting room, announces login.
   */
  private handlePressEnter(descriptor: Descriptor, _input: string): void {
    descriptor.write('\r\nWelcome to SMAUG 2.0!\r\n\r\n');

    // Set state to Playing
    descriptor.state = ConnectionState.Playing;

    // Emit login event
    this.eventBus.emit(GameEvent.CharacterLogin, {
      descriptorId: descriptor.id,
      name: descriptor.nannyData.name,
      isNew: descriptor.nannyData.isNew,
    });
  }

  /**
   * Show the Message of the Day.
   */
  private showMotd(descriptor: Descriptor): void {
    descriptor.write('\r\n');
    descriptor.write('='.repeat(60) + '\r\n');
    descriptor.write('              Welcome to SMAUG 2.0\r\n');
    descriptor.write('         The Next Generation MUD Engine\r\n');
    descriptor.write('='.repeat(60) + '\r\n');
    descriptor.write('\r\n');
  }

  /**
   * Show available races.
   */
  private showRaceList(descriptor: Descriptor): void {
    descriptor.write('  Available races: ');
    descriptor.write(VALID_RACES.join(', '));
    descriptor.write('\r\n');
  }

  /**
   * Show available classes.
   */
  private showClassList(descriptor: Descriptor): void {
    descriptor.write('  Available classes: ');
    descriptor.write(VALID_CLASSES.join(', '));
    descriptor.write('\r\n');
  }

  /**
   * Validate a character name.
   * Must be 3-12 chars, alphabetic only, not a reserved name.
   */
  private isValidName(name: string): boolean {
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) return false;
    if (!/^[a-zA-Z]+$/.test(name)) return false;
    if (RESERVED_NAMES.has(name.toLowerCase())) return false;
    return true;
  }

  /**
   * Check if a player exists in the database (stub).
   * Returns false for now - in production would check PlayerRepository.
   */
  private findExistingPlayer(_name: string): boolean {
    // TODO: Check PlayerRepository for existing player
    return false;
  }

  /** Flush all descriptor output buffers. */
  flushOutput(): void {
    for (const desc of this.descriptors.values()) {
      desc.flush();
    }
  }

  /** Get all active descriptors. */
  getAllDescriptors(): Descriptor[] {
    return Array.from(this.descriptors.values());
  }

  /** Get descriptors that are in Playing state. */
  getPlayingDescriptors(): Descriptor[] {
    return this.getAllDescriptors().filter(d => d.state === ConnectionState.Playing);
  }

  /** Current connection count. */
  get connectionCount(): number {
    return this.descriptors.size;
  }

  /** Get the default start room vnum. */
  static get defaultStartRoom(): number {
    return DEFAULT_START_ROOM;
  }
}