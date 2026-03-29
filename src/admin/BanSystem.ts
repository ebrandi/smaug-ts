/**
 * BanSystem – Site and name ban management.
 *
 * Checks incoming connections against the ban list (site bans with
 * prefix/suffix matching), enforces name bans during character creation,
 * and provides admin commands to add/remove bans.
 */

export interface BanEntry {
  id: string;
  name: string;
  user: string;
  note: string;
  bannedBy: string;
  bannedAt: Date;
  flagType: 'newbie' | 'mortal' | 'all' | 'level' | 'warn';
  level: number;
  unbanDate: Date | null;
  duration: number;  // -1 = permanent
  prefix: boolean;
  suffix: boolean;
}

export class BanSystem {
  private bans: BanEntry[] = [];

  /**
   * Check if a host at the given level is banned.
   * Returns the matching BanEntry or null if not banned.
   */
  checkBan(host: string, level: number): BanEntry | null {
    const now = new Date();

    for (const ban of this.bans) {
      // Skip expired bans
      if (ban.unbanDate !== null && ban.unbanDate <= now) {
        continue;
      }

      // Check host match
      if (!this.matchHost(host, ban)) {
        continue;
      }

      // Check ban type vs level
      switch (ban.flagType) {
        case 'all':
          return ban;
        case 'newbie':
          if (level <= 1) return ban;
          break;
        case 'mortal':
          if (level < 51) return ban;
          break;
        case 'level':
          if (level <= ban.level) return ban;
          break;
        case 'warn':
          // Warn bans don't block, but we still return them for logging
          return ban;
      }
    }

    return null;
  }

  /** Add a ban entry. */
  addBan(ban: BanEntry): void {
    this.bans.push(ban);
  }

  /** Remove a ban by ID. Returns true if found and removed. */
  removeBan(id: string): boolean {
    const idx = this.bans.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.bans.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Get all active bans. */
  getAllBans(): BanEntry[] {
    return [...this.bans];
  }

  /**
   * Match a host against a ban entry.
   *
   * - prefix only: ban.name matches start of host
   * - suffix only: ban.name matches end of host
   * - prefix + suffix: ban.name is contained in host
   * - neither: exact match
   */
  private matchHost(host: string, ban: BanEntry): boolean {
    const hostLower = host.toLowerCase();
    const banLower = ban.name.toLowerCase();

    if (ban.prefix && ban.suffix) {
      // Contains match
      return hostLower.includes(banLower);
    } else if (ban.prefix) {
      // Prefix: ban name matches start of host
      return hostLower.startsWith(banLower);
    } else if (ban.suffix) {
      // Suffix: ban name matches end of host
      return hostLower.endsWith(banLower);
    } else {
      // Exact match
      return hostLower === banLower;
    }
  }
}
