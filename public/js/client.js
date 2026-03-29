/**
 * Browser MUD Client for SMAUG 2.0
 *
 * Connects via Socket.IO to the game server. Renders ANSI escape codes
 * as styled HTML spans. Supports command history (arrow keys), GMCP
 * data display, and auto-scrolling output.
 */

// =============================================================================
// ANSI Parser — converts ANSI escape sequences to HTML spans
// =============================================================================

const SGR_CLASS_MAP = {
  0: '',
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

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ansiToHtml(text, state) {
  const ANSI_RE = /\x1b\[([0-9;]*)m/g;
  let html = '';
  let lastIndex = 0;
  let match;

  while ((match = ANSI_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const chunk = escapeHtml(text.substring(lastIndex, match.index));
      if (state.classes.size > 0) {
        html += '<span class="' + [...state.classes].join(' ') + '">' + chunk + '</span>';
      } else {
        html += chunk;
      }
    }
    lastIndex = match.index + match[0].length;

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

  if (lastIndex < text.length) {
    const chunk = escapeHtml(text.substring(lastIndex));
    if (state.classes.size > 0) {
      html += '<span class="' + [...state.classes].join(' ') + '">' + chunk + '</span>';
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
  constructor(maxSize) {
    this._history = [];
    this._index = -1;
    this._maxSize = maxSize || 100;
  }

  push(cmd) {
    if (cmd.trim() === '') return;
    if (this._history.length > 0 && this._history[this._history.length - 1] === cmd) {
      this._index = -1;
      return;
    }
    this._history.push(cmd);
    if (this._history.length > this._maxSize) this._history.shift();
    this._index = -1;
  }

  up() {
    if (this._history.length === 0) return null;
    if (this._index < 0) this._index = this._history.length;
    this._index = Math.max(0, this._index - 1);
    return this._history[this._index] || null;
  }

  down() {
    if (this._index < 0) return null;
    this._index++;
    if (this._index >= this._history.length) {
      this._index = -1;
      return '';
    }
    return this._history[this._index] || null;
  }

  getAll() {
    return this._history.slice();
  }
}

// =============================================================================
// GMCP Handler
// =============================================================================

function updateGmcp(data) {
  var panel = document.getElementById('gmcp-panel');
  if (panel) panel.style.display = 'block';

  function set(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined) el.textContent = String(val);
  }

  set('gmcp-name', data.name);
  set('gmcp-level', data.level);

  if (data.hp !== undefined && data.maxHp) {
    set('gmcp-hp', data.hp + '/' + data.maxHp);
    var bar = document.getElementById('gmcp-hp-bar');
    if (bar) bar.style.width = Math.max(0, Math.min(100, (data.hp / data.maxHp) * 100)) + '%';
  }
  if (data.mana !== undefined && data.maxMana) {
    set('gmcp-mana', data.mana + '/' + data.maxMana);
    var bar2 = document.getElementById('gmcp-mana-bar');
    if (bar2) bar2.style.width = Math.max(0, Math.min(100, (data.mana / data.maxMana) * 100)) + '%';
  }
  if (data.move !== undefined && data.maxMove) {
    set('gmcp-move', data.move + '/' + data.maxMove);
    var bar3 = document.getElementById('gmcp-move-bar');
    if (bar3) bar3.style.width = Math.max(0, Math.min(100, (data.move / data.maxMove) * 100)) + '%';
  }
}

// =============================================================================
// MUD Client
// =============================================================================

class MudClient {
  constructor() {
    this.output = document.getElementById('output');
    this.input = document.getElementById('cmd-input');
    this.statusEl = document.getElementById('conn-status');
    this.cmdHistory = new CommandHistory(200);
    this.ansiState = { classes: new Set() };
    this.maxLines = 5000;
    this.connected = false;
    this.socket = null;

    this._bindEvents();
    this._connect();
  }

  _connect() {
    this._setStatus('Connecting...');

    var ioLib = window.io;
    if (!ioLib) {
      this._appendSystem('ERROR: Socket.IO library not loaded. Ensure the server provides /socket.io/socket.io.js');
      return;
    }

    this.socket = ioLib({ path: '/play' });
    var self = this;

    this.socket.on('connect', function() {
      self.connected = true;
      self._setStatus('Connected', true);
      self._appendSystem('Connected to SMAUG 2.0');
    });

    this.socket.on('disconnect', function() {
      self.connected = false;
      self._setStatus('Disconnected');
      self._appendSystem('Disconnected from server');
    });

    this.socket.on('output', function(data) {
      self._appendOutput(data);
    });

    this.socket.on('gmcp', function(module, data) {
      if (module === 'Char.Vitals' || module === 'Char.Status') {
        updateGmcp(data);
      }
    });

    this.socket.on('connect_error', function() {
      self._setStatus('Connection Error');
    });
  }

  _bindEvents() {
    var self = this;
    this.input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        self._sendCommand();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = self.cmdHistory.up();
        if (prev !== null) self.input.value = prev;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = self.cmdHistory.down();
        if (next !== null) self.input.value = next;
      }
    });

    var sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', function() { self._sendCommand(); });
    }
  }

  _sendCommand() {
    var cmd = this.input.value;
    this.input.value = '';
    if (!this.connected) {
      this._appendSystem('Not connected to server');
      return;
    }
    this.cmdHistory.push(cmd);
    this.socket.emit('input', cmd + '\n');
  }

  _appendOutput(text) {
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var div = document.createElement('div');
      div.className = 'line';
      div.innerHTML = ansiToHtml(lines[i], this.ansiState) || '&nbsp;';
      this.output.appendChild(div);
    }
    this._trimOutput();
    this._scrollToBottom();
  }

  _appendSystem(text) {
    var div = document.createElement('div');
    div.className = 'line';
    div.style.color = '#888';
    div.textContent = '[System] ' + text;
    this.output.appendChild(div);
    this._scrollToBottom();
  }

  _trimOutput() {
    while (this.output.children.length > this.maxLines) {
      this.output.removeChild(this.output.firstChild);
    }
  }

  _scrollToBottom() {
    this.output.scrollTop = this.output.scrollHeight;
  }

  _setStatus(text, isConnected) {
    this.statusEl.textContent = text;
    this.statusEl.className = 'status' + (isConnected ? ' connected' : '');
  }
}

// =============================================================================
// Initialize
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
  new MudClient();
});

// Export for testing (Node.js / CommonJS environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ansiToHtml, CommandHistory, escapeHtml };
}
