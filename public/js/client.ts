/**
 * Browser MUD Client for SMAUG 2.0
 *
 * Connects via Socket.IO to the game server. Renders ANSI escape codes
 * as styled HTML spans. Supports command history (arrow keys), GMCP
 * data display, and auto-scrolling output.
 *
 * This file is compiled to client.js and served as a static asset.
 * In development it can be loaded directly with a bundler or
 * transpiled with `npx tsc --outDir public/js public/js/client.ts`.
 */

// =============================================================================
// ANSI Parser — converts ANSI escape sequences to HTML spans
// =============================================================================

/** Map ANSI SGR codes to CSS class names. */
const SGR_CLASS_MAP: Record<number, string> = {
  0: '',                // reset
  1: 'ansi-bold',
  5: 'ansi-blink',
  30: 'ansi-black',     31: 'ansi-red',        32: 'ansi-green',
  33: 'ansi-yellow',    34: 'ansi-blue',       35: 'ansi-magenta',
  36: 'ansi-cyan',      37: 'ansi-white',
  40: 'ansi-bg-black',  41: 'ansi-bg-red',     42: 'ansi-bg-green',
  43: 'ansi-bg-yellow', 44: 'ansi-bg-blue',    45: 'ansi-bg-magenta',
  46: 'ansi-bg-cyan',   47: 'ansi-bg-white',
  90: 'ansi-bright-black',  91: 'ansi-bright-red',     92: 'ansi-bright-green',
  93: 'ansi-bright-yellow', 94: 'ansi-bright-blue',    95: 'ansi-bright-magenta',
  96: 'ansi-bright-cyan',   97: 'ansi-bright-white',
};

interface AnsiState {
  classes: Set<string>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parse a string containing ANSI escape codes and return an HTML string
 * with appropriate <span> elements for styling.
 */
function ansiToHtml(text: string, state: AnsiState): string {
  const ANSI_RE = /\x1b\[([0-9;]*)m/g;
  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ANSI_RE.exec(text)) !== null) {
    // Emit text before this escape
    if (match.index > lastIndex) {
      const chunk = escapeHtml(text.substring(lastIndex, match.index));
      if (state.classes.size > 0) {
        html += `<span class="${[...state.classes].join(' ')}">${chunk}</span>`;
      } else {
        html += chunk;
      }
    }
    lastIndex = match.index + match[0].length;

    // Process SGR codes
    const codes = match[1] ? match[1].split(';').map(Number) : [0];
    for (const code of codes) {
      if (code === 0) {
        state.classes.clear();
      } else {
        const cls = SGR_CLASS_MAP[code];
        if (cls) state.classes.add(cls);
      }
    }
  }

  // Remaining text after last escape
  if (lastIndex < text.length) {
    const chunk = escapeHtml(text.substring(lastIndex));
    if (state.classes.size > 0) {
      html += `<span class="${[...state.classes].join(' ')}">${chunk}</span>`;
    } else {
      html += chunk;
    }
  }

  return html;
}

// =============================================================================
// Command History
// =============================================================================

class CommandHistory {
  private history: string[] = [];
  private index = -1;
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(cmd: string): void {
    if (cmd.trim() === '') return;
    // Avoid duplicating last entry
    if (this.history.length > 0 && this.history[this.history.length - 1] === cmd) {
      this.index = -1;
      return;
    }
    this.history.push(cmd);
    if (this.history.length > this.maxSize) this.history.shift();
    this.index = -1;
  }

  up(): string | null {
    if (this.history.length === 0) return null;
    if (this.index < 0) this.index = this.history.length;
    this.index = Math.max(0, this.index - 1);
    return this.history[this.index] ?? null;
  }

  down(): string | null {
    if (this.index < 0) return null;
    this.index++;
    if (this.index >= this.history.length) {
      this.index = -1;
      return '';
    }
    return this.history[this.index] ?? null;
  }

  getAll(): string[] {
    return [...this.history];
  }
}

// =============================================================================
// GMCP Handler
// =============================================================================

interface GmcpCharVitals {
  name?: string;
  level?: number;
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  move?: number;
  maxMove?: number;
}

function updateGmcp(data: GmcpCharVitals): void {
  const panel = document.getElementById('gmcp-panel');
  if (panel) panel.style.display = 'block';

  const set = (id: string, val: string | number | undefined) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.textContent = String(val);
  };

  set('gmcp-name', data.name);
  set('gmcp-level', data.level);

  if (data.hp !== undefined && data.maxHp) {
    set('gmcp-hp', `${data.hp}/${data.maxHp}`);
    const bar = document.getElementById('gmcp-hp-bar');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (data.hp / data.maxHp) * 100))}%`;
  }
  if (data.mana !== undefined && data.maxMana) {
    set('gmcp-mana', `${data.mana}/${data.maxMana}`);
    const bar = document.getElementById('gmcp-mana-bar');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (data.mana / data.maxMana) * 100))}%`;
  }
  if (data.move !== undefined && data.maxMove) {
    set('gmcp-move', `${data.move}/${data.maxMove}`);
    const bar = document.getElementById('gmcp-move-bar');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (data.move / data.maxMove) * 100))}%`;
  }
}

// =============================================================================
// MUD Client
// =============================================================================

class MudClient {
  private socket: any; // Socket.IO socket
  private output: HTMLElement;
  private input: HTMLInputElement;
  private statusEl: HTMLElement;
  private cmdHistory: CommandHistory;
  private ansiState: AnsiState;
  private maxLines: number;
  private connected = false;

  constructor() {
    this.output = document.getElementById('output')!;
    this.input = document.getElementById('cmd-input')!;
    this.statusEl = document.getElementById('conn-status')!;
    this.cmdHistory = new CommandHistory(200);
    this.ansiState = { classes: new Set() };
    this.maxLines = 5000;

    this.bindEvents();
    this.connect();
  }

  private connect(): void {
    this.setStatus('Connecting...');

    // Socket.IO should be loaded from the server (served by socket.io)
    const ioLib = (window as any).io;
    if (!ioLib) {
      this.appendSystem('ERROR: Socket.IO library not loaded. Ensure the server provides /socket.io/socket.io.js');
      return;
    }

    this.socket = ioLib({ path: '/play' });

    this.socket.on('connect', () => {
      this.connected = true;
      this.setStatus('Connected', true);
      this.appendSystem('Connected to SMAUG 2.0');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.setStatus('Disconnected');
      this.appendSystem('Disconnected from server');
    });

    this.socket.on('output', (data: string) => {
      this.appendOutput(data);
    });

    this.socket.on('gmcp', (module: string, data: unknown) => {
      if (module === 'Char.Vitals' || module === 'Char.Status') {
        updateGmcp(data as GmcpCharVitals);
      }
    });

    this.socket.on('connect_error', () => {
      this.setStatus('Connection Error');
    });
  }

  private bindEvents(): void {
    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.sendCommand();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = this.cmdHistory.up();
        if (prev !== null) this.input.value = prev;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = this.cmdHistory.down();
        if (next !== null) this.input.value = next;
      }
    });

    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendCommand());
    }
  }

  private sendCommand(): void {
    const cmd = this.input.value;
    this.input.value = '';
    if (!this.connected) {
      this.appendSystem('Not connected to server');
      return;
    }
    this.cmdHistory.push(cmd);
    this.socket.emit('input', cmd + '\n');
  }

  private appendOutput(text: string): void {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const div = document.createElement('div');
      div.className = 'line';
      div.innerHTML = ansiToHtml(line, this.ansiState) || '&nbsp;';
      this.output.appendChild(div);
    }
    this.trimOutput();
    this.scrollToBottom();
  }

  private appendSystem(text: string): void {
    const div = document.createElement('div');
    div.className = 'line';
    div.style.color = '#888';
    div.textContent = `[System] ${text}`;
    this.output.appendChild(div);
    this.scrollToBottom();
  }

  private trimOutput(): void {
    while (this.output.children.length > this.maxLines) {
      this.output.removeChild(this.output.firstChild!);
    }
  }

  private scrollToBottom(): void {
    this.output.scrollTop = this.output.scrollHeight;
  }

  private setStatus(text: string, isConnected = false): void {
    this.statusEl.textContent = text;
    this.statusEl.className = 'status' + (isConnected ? ' connected' : '');
  }
}

// =============================================================================
// Initialize
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  new MudClient();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ansiToHtml, CommandHistory, escapeHtml };
}
