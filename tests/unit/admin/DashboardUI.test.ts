/**
 * DashboardUI Unit Tests
 *
 * Validates that each page generator produces valid HTML with expected
 * content sections, navigation, and login overlay.
 */

import { describe, it, expect } from 'vitest';
import {
  dashboardPage,
  playersPage,
  areasPage,
  logsPage,
  createDashboardRouter,
} from '../../../src/admin/DashboardUI.js';

// =============================================================================
// Page HTML Content Tests
// =============================================================================

describe('DashboardUI: dashboardPage', () => {
  const html = dashboardPage();

  it('should return valid HTML document', () => {
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('should contain the page title', () => {
    expect(html).toContain('Dashboard');
    expect(html).toContain('SMAUG 2.0');
  });

  it('should contain stat boxes', () => {
    expect(html).toContain('stat-players');
    expect(html).toContain('stat-uptime');
    expect(html).toContain('stat-memory');
    expect(html).toContain('stat-areas');
    expect(html).toContain('stat-rooms');
    expect(html).toContain('stat-mobiles');
    expect(html).toContain('stat-objects');
    expect(html).toContain('stat-tick');
  });

  it('should contain navigation links', () => {
    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/admin/players"');
    expect(html).toContain('href="/admin/areas"');
    expect(html).toContain('href="/admin/logs"');
  });

  it('should contain login overlay', () => {
    expect(html).toContain('login-overlay');
    expect(html).toContain('login-name');
    expect(html).toContain('login-pass');
    expect(html).toContain('doLogin');
  });

  it('should contain logout link', () => {
    expect(html).toContain('doLogout');
  });

  it('should contain API fetch JS', () => {
    expect(html).toContain('apiFetch');
    expect(html).toContain('/dashboard');
  });

  it('should mark dashboard as active nav', () => {
    expect(html).toMatch(/href="\/admin"[^>]*class="active"/);
  });
});

describe('DashboardUI: playersPage', () => {
  const html = playersPage();

  it('should contain player table headers', () => {
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<th>Level</th>');
    expect(html).toContain('<th>Class</th>');
    expect(html).toContain('<th>Race</th>');
    expect(html).toContain('<th>Room</th>');
    expect(html).toContain('<th>Idle</th>');
    expect(html).toContain('<th>Host</th>');
    expect(html).toContain('<th>Actions</th>');
  });

  it('should contain freeze and disconnect actions', () => {
    expect(html).toContain('freezePlayer');
    expect(html).toContain('disconnectPlayer');
  });

  it('should fetch from /players endpoint', () => {
    expect(html).toContain("'/players'");
  });

  it('should mark players as active nav', () => {
    expect(html).toMatch(/href="\/admin\/players"[^>]*class="active"/);
  });
});

describe('DashboardUI: areasPage', () => {
  const html = areasPage();

  it('should contain area table headers', () => {
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<th>Author</th>');
    expect(html).toContain('<th>Reset Freq</th>');
  });

  it('should contain reset action', () => {
    expect(html).toContain('resetArea');
  });

  it('should fetch from /areas endpoint', () => {
    expect(html).toContain("'/areas'");
  });
});

describe('DashboardUI: logsPage', () => {
  const html = logsPage();

  it('should contain filter inputs', () => {
    expect(html).toContain('filter-actor');
    expect(html).toContain('filter-action');
  });

  it('should contain log list container', () => {
    expect(html).toContain('log-list');
    expect(html).toContain('log-total');
  });

  it('should fetch from /logs endpoint', () => {
    expect(html).toContain("'/logs'");
  });
});

describe('DashboardUI: createDashboardRouter', () => {
  it('should create an Express router', () => {
    const router = createDashboardRouter();
    expect(router).toBeDefined();
    // Router has a stack of route layers
    expect(router.stack).toBeDefined();
    expect(router.stack.length).toBeGreaterThan(0);
  });

  it('should have routes for all 4 pages', () => {
    const router = createDashboardRouter();
    const paths = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/players');
    expect(paths).toContain('/areas');
    expect(paths).toContain('/logs');
  });

  // --- PARITY: Partial implementation stubs ---
  it.todo('should provide real-time WebSocket updates to dashboard');
  it.todo('should allow command execution from dashboard UI');
  it.todo('should integrate with area editor for live editing');


});
