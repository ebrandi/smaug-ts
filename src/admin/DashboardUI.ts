/**
 * DashboardUI – Server-rendered HTML admin dashboard for SMAUG 2.0.
 *
 * Generates static HTML pages served by Express. No React/Vite dependency —
 * plain HTML + inline CSS + vanilla JS that fetches data from the AdminRouter
 * REST API. Provides DashboardPage, PlayersPage, AreasPage, and LogsPage.
 *
 * Usage:
 *   import { mountDashboardUI } from './DashboardUI.js';
 *   mountDashboardUI(app, '/admin');
 */

import { Router, type Request, type Response } from 'express';
import { Logger } from '../utils/Logger.js';

const LOG_DOMAIN = 'dashboard-ui';

// =============================================================================
// Shared Layout
// =============================================================================

/** Common CSS shared by all dashboard pages. */
const DASHBOARD_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; background: #1a1a2e; color: #e0e0e0; }
  a { color: #64b5f6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .navbar { background: #16213e; padding: 12px 24px; display: flex; gap: 24px; align-items: center; border-bottom: 1px solid #0f3460; }
  .navbar h1 { font-size: 18px; color: #e94560; margin-right: 24px; }
  .navbar a { color: #a0c4ff; font-size: 14px; padding: 4px 12px; border-radius: 4px; }
  .navbar a:hover, .navbar a.active { background: #0f3460; color: #fff; text-decoration: none; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  .card { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
  .card h2 { font-size: 16px; color: #e94560; margin-bottom: 12px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .stat-box { background: #0f3460; border-radius: 6px; padding: 16px; text-align: center; }
  .stat-box .value { font-size: 28px; font-weight: bold; color: #64b5f6; }
  .stat-box .label { font-size: 12px; color: #aaa; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; padding: 8px 12px; color: #e94560; border-bottom: 2px solid #0f3460; }
  td { padding: 8px 12px; border-bottom: 1px solid #0f3460; }
  tr:hover td { background: rgba(15,52,96,0.5); }
  .btn { background: #0f3460; color: #e0e0e0; border: 1px solid #64b5f6; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 13px; }
  .btn:hover { background: #64b5f6; color: #1a1a2e; }
  .btn-danger { border-color: #e94560; }
  .btn-danger:hover { background: #e94560; }
  #login-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; }
  #login-box { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 32px; width: 340px; }
  #login-box h2 { color: #e94560; margin-bottom: 16px; }
  #login-box input { width: 100%; padding: 8px; margin-bottom: 12px; background: #0f3460; border: 1px solid #64b5f6; color: #e0e0e0; border-radius: 4px; font-family: inherit; }
  #login-box .error { color: #e94560; font-size: 13px; margin-bottom: 8px; min-height: 18px; }
  .log-entry { font-size: 13px; padding: 6px 0; border-bottom: 1px solid #0f3460; }
  .log-entry .ts { color: #888; }
  .log-entry .actor { color: #64b5f6; }
  .log-entry .action { color: #e94560; }
  .empty { color: #666; text-align: center; padding: 24px; font-style: italic; }
  .refresh-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .refresh-bar .status { font-size: 12px; color: #888; }
`;

/** Shared inline JS for auth token management and API calls. */
const DASHBOARD_JS_CORE = `
  const API_BASE = '/api';

  function getToken() { return localStorage.getItem('smaug_admin_token'); }
  function setToken(t) { localStorage.setItem('smaug_admin_token', t); }
  function clearToken() { localStorage.removeItem('smaug_admin_token'); }

  async function apiFetch(path, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, { ...opts, headers });
    if (res.status === 401) { clearToken(); showLogin(); throw new Error('Unauthorized'); }
    return res;
  }

  function showLogin() {
    const el = document.getElementById('login-overlay');
    if (el) el.style.display = 'flex';
  }
  function hideLogin() {
    const el = document.getElementById('login-overlay');
    if (el) el.style.display = 'none';
  }

  async function doLogin() {
    const name = document.getElementById('login-name').value.trim();
    const password = document.getElementById('login-pass').value;
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    if (!name || !password) { errEl.textContent = 'Name and password required'; return; }
    try {
      const res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.error || 'Login failed'; return; }
      setToken(data.token);
      hideLogin();
      if (typeof refreshPage === 'function') refreshPage();
    } catch (e) { errEl.textContent = 'Network error'; }
  }

  function doLogout() { clearToken(); showLogin(); }

  // Show login if no token
  document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) showLogin();
    else if (typeof refreshPage === 'function') refreshPage();
  });
`;

/**
 * Wrap page body content in the common layout shell.
 */
function layout(title: string, activePage: string, bodyContent: string, pageJs: string): string {
  const navItems = [
    { href: '/admin', label: 'Dashboard', key: 'dashboard' },
    { href: '/admin/players', label: 'Players', key: 'players' },
    { href: '/admin/areas', label: 'Areas', key: 'areas' },
    { href: '/admin/logs', label: 'Logs', key: 'logs' },
  ];

  const navHtml = navItems.map(n =>
    `<a href="${n.href}" class="${n.key === activePage ? 'active' : ''}">${n.label}</a>`
  ).join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SMAUG 2.0 Admin</title>
  <style>${DASHBOARD_CSS}</style>
</head>
<body>
  <nav class="navbar">
    <h1>SMAUG 2.0</h1>
    ${navHtml}
    <a href="javascript:void(0)" onclick="doLogout()" style="margin-left:auto;">Logout</a>
  </nav>

  <div id="login-overlay" style="display:none;">
    <div id="login-box">
      <h2>Admin Login</h2>
      <div id="login-error" class="error"></div>
      <input id="login-name" placeholder="Character Name" autocomplete="username" />
      <input id="login-pass" type="password" placeholder="Password" autocomplete="current-password" />
      <button class="btn" onclick="doLogin()" style="width:100%;">Login</button>
    </div>
  </div>

  <div class="container">
    ${bodyContent}
  </div>

  <script>${DASHBOARD_JS_CORE}</script>
  <script>${pageJs}</script>
</body>
</html>`;
}

// =============================================================================
// Page Generators
// =============================================================================

/** Dashboard overview page with server stats. */
export function dashboardPage(): string {
  const body = `
    <div class="refresh-bar">
      <h2 style="color:#e94560;">Server Overview</h2>
      <span class="status" id="last-update">Loading...</span>
    </div>
    <div class="stats-grid" id="stats-grid">
      <div class="stat-box"><div class="value" id="stat-players">—</div><div class="label">Players Online</div></div>
      <div class="stat-box"><div class="value" id="stat-uptime">—</div><div class="label">Uptime</div></div>
      <div class="stat-box"><div class="value" id="stat-memory">—</div><div class="label">Memory (MB)</div></div>
      <div class="stat-box"><div class="value" id="stat-areas">—</div><div class="label">Areas</div></div>
      <div class="stat-box"><div class="value" id="stat-rooms">—</div><div class="label">Rooms</div></div>
      <div class="stat-box"><div class="value" id="stat-mobiles">—</div><div class="label">Mobiles</div></div>
      <div class="stat-box"><div class="value" id="stat-objects">—</div><div class="label">Objects</div></div>
      <div class="stat-box"><div class="value" id="stat-tick">—</div><div class="label">Avg Tick (ms)</div></div>
    </div>
    <div class="card" style="margin-top:24px;">
      <h2>Node.js</h2>
      <p id="node-version">—</p>
    </div>
  `;

  const js = `
    async function refreshPage() {
      try {
        const res = await apiFetch('/dashboard');
        if (!res.ok) return;
        const d = await res.json();
        document.getElementById('stat-players').textContent = d.onlinePlayers;
        const h = Math.floor(d.uptime / 3600);
        const m = Math.floor((d.uptime % 3600) / 60);
        document.getElementById('stat-uptime').textContent = h + 'h ' + m + 'm';
        document.getElementById('stat-memory').textContent = d.memoryUsedMB.toFixed(1);
        document.getElementById('stat-areas').textContent = d.areaCount;
        document.getElementById('stat-rooms').textContent = d.roomCount;
        document.getElementById('stat-mobiles').textContent = d.mobileCount;
        document.getElementById('stat-objects').textContent = d.objectCount;
        document.getElementById('stat-tick').textContent = d.averageTickMs.toFixed(2);
        document.getElementById('node-version').textContent = d.nodeVersion;
        document.getElementById('last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString();
      } catch (e) { /* login redirect handled by apiFetch */ }
    }
    setInterval(refreshPage, 10000);
  `;

  return layout('Dashboard', 'dashboard', body, js);
}

/** Online players management page. */
export function playersPage(): string {
  const body = `
    <div class="refresh-bar">
      <h2 style="color:#e94560;">Online Players</h2>
      <button class="btn" onclick="refreshPage()">Refresh</button>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Level</th><th>Class</th><th>Race</th><th>Room</th><th>Idle</th><th>Host</th><th>Actions</th></tr></thead>
        <tbody id="player-body"><tr><td colspan="8" class="empty">Loading...</td></tr></tbody>
      </table>
    </div>
  `;

  const js = `
    async function refreshPage() {
      try {
        const res = await apiFetch('/players');
        if (!res.ok) return;
        const data = await res.json();
        const tbody = document.getElementById('player-body');
        if (!data.players || data.players.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" class="empty">No players online</td></tr>';
          return;
        }
        tbody.innerHTML = data.players.map(p =>
          '<tr>' +
          '<td>' + esc(p.name) + '</td>' +
          '<td>' + p.level + '</td>' +
          '<td>' + esc(p.class) + '</td>' +
          '<td>' + esc(p.race) + '</td>' +
          '<td>' + p.roomVnum + '</td>' +
          '<td>' + p.idleTime + 's</td>' +
          '<td>' + esc(p.host) + '</td>' +
          '<td><button class="btn btn-danger" onclick="freezePlayer(\\'' + esc(p.name) + '\\')">Freeze</button> ' +
          '<button class="btn btn-danger" onclick="disconnectPlayer(\\'' + esc(p.name) + '\\')">DC</button></td>' +
          '</tr>'
        ).join('');
      } catch (e) { /* handled */ }
    }

    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    async function freezePlayer(name) {
      await apiFetch('/players/' + encodeURIComponent(name) + '/freeze', { method: 'POST' });
      refreshPage();
    }
    async function disconnectPlayer(name) {
      if (!confirm('Disconnect ' + name + '?')) return;
      await apiFetch('/players/' + encodeURIComponent(name) + '/disconnect', { method: 'POST' });
      refreshPage();
    }
  `;

  return layout('Players', 'players', body, js);
}

/** Areas listing and management page. */
export function areasPage(): string {
  const body = `
    <div class="refresh-bar">
      <h2 style="color:#e94560;">Areas</h2>
      <button class="btn" onclick="refreshPage()">Refresh</button>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Author</th><th>Rooms</th><th>Mobiles</th><th>Objects</th><th>Age</th><th>Reset Freq</th><th>Players</th><th>Actions</th></tr></thead>
        <tbody id="area-body"><tr><td colspan="9" class="empty">Loading...</td></tr></tbody>
      </table>
    </div>
  `;

  const js = `
    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    async function refreshPage() {
      try {
        const res = await apiFetch('/areas');
        if (!res.ok) return;
        const data = await res.json();
        const tbody = document.getElementById('area-body');
        if (!data.areas || data.areas.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="empty">No areas loaded</td></tr>';
          return;
        }
        tbody.innerHTML = data.areas.map(a => {
          const rng = a.vnumRanges || {};
          return '<tr>' +
            '<td>' + esc(a.name) + '</td>' +
            '<td>' + esc(a.author) + '</td>' +
            '<td>' + ((rng.rooms||{}).low||0) + '-' + ((rng.rooms||{}).high||0) + '</td>' +
            '<td>' + ((rng.mobiles||{}).low||0) + '-' + ((rng.mobiles||{}).high||0) + '</td>' +
            '<td>' + ((rng.objects||{}).low||0) + '-' + ((rng.objects||{}).high||0) + '</td>' +
            '<td>' + a.age + '</td>' +
            '<td>' + a.resetFrequency + '</td>' +
            '<td>' + (a.playerCount || 0) + '</td>' +
            '<td><button class="btn" onclick="resetArea(\\'' + esc(a.name) + '\\')">Reset</button></td>' +
            '</tr>';
        }).join('');
      } catch (e) { /* handled */ }
    }

    async function resetArea(name) {
      if (!confirm('Reset area ' + name + '?')) return;
      await apiFetch('/areas/' + encodeURIComponent(name) + '/reset', { method: 'POST' });
      refreshPage();
    }
  `;

  return layout('Areas', 'areas', body, js);
}

/** Audit logs viewer page. */
export function logsPage(): string {
  const body = `
    <div class="refresh-bar">
      <h2 style="color:#e94560;">Audit Logs</h2>
      <div>
        <input id="filter-actor" placeholder="Filter by actor" style="background:#0f3460;border:1px solid #64b5f6;color:#e0e0e0;padding:4px 8px;border-radius:4px;margin-right:8px;" />
        <input id="filter-action" placeholder="Filter by action" style="background:#0f3460;border:1px solid #64b5f6;color:#e0e0e0;padding:4px 8px;border-radius:4px;margin-right:8px;" />
        <button class="btn" onclick="refreshPage()">Search</button>
      </div>
    </div>
    <div class="card">
      <div id="log-list"><div class="empty">Loading...</div></div>
      <div style="text-align:center;margin-top:12px;">
        <span id="log-total" style="color:#888;font-size:13px;"></span>
      </div>
    </div>
  `;

  const js = `
    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    async function refreshPage() {
      try {
        const actor = document.getElementById('filter-actor').value.trim();
        const action = document.getElementById('filter-action').value.trim();
        let qs = '?limit=100';
        if (actor) qs += '&actor=' + encodeURIComponent(actor);
        if (action) qs += '&action=' + encodeURIComponent(action);
        const res = await apiFetch('/logs' + qs);
        if (!res.ok) return;
        const data = await res.json();
        const list = document.getElementById('log-list');
        document.getElementById('log-total').textContent = 'Total entries: ' + (data.total || 0);
        if (!data.logs || data.logs.length === 0) {
          list.innerHTML = '<div class="empty">No log entries found</div>';
          return;
        }
        list.innerHTML = data.logs.map(e =>
          '<div class="log-entry">' +
          '<span class="ts">' + new Date(e.timestamp).toLocaleString() + '</span> ' +
          '<span class="actor">' + esc(e.actor) + '</span> ' +
          '<span class="action">' + esc(e.action) + '</span> → ' +
          esc(e.target) + ' ' +
          '<span style="color:#888">' + esc(e.details) + '</span>' +
          '</div>'
        ).join('');
      } catch (e) { /* handled */ }
    }
  `;

  return layout('Logs', 'logs', body, js);
}

// =============================================================================
// Router Mount
// =============================================================================

/**
 * Mount the dashboard UI routes on an Express app.
 *
 * @param basePath - Base path for the admin UI (e.g., '/admin')
 * @param logger - Optional logger
 * @returns Express Router with dashboard page routes
 */
export function createDashboardRouter(logger?: Logger): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    logger?.debug(LOG_DOMAIN, 'Serving dashboard page');
    res.type('html').send(dashboardPage());
  });

  router.get('/players', (_req: Request, res: Response) => {
    logger?.debug(LOG_DOMAIN, 'Serving players page');
    res.type('html').send(playersPage());
  });

  router.get('/areas', (_req: Request, res: Response) => {
    logger?.debug(LOG_DOMAIN, 'Serving areas page');
    res.type('html').send(areasPage());
  });

  router.get('/logs', (_req: Request, res: Response) => {
    logger?.debug(LOG_DOMAIN, 'Serving logs page');
    res.type('html').send(logsPage());
  });

  return router;
}
