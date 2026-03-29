/**
 * PlayerFileParser – Legacy player file parser.
 *
 * Parses SMAUG-format player save files from the legacy player/
 * directory into structured data suitable for importing into the
 * Prisma database via PlayerRepository.
 *
 * Handles the section-based player file format with keywords like
 * Name, Paswd, Sex, Race, Class, Level, etc.
 *
 * @stub Phase 2b implementation
 */

import { PrismaClient } from '@prisma/client';
import { readdir } from 'fs/promises';

/** Result from migrating player files. */
export interface PlayerMigrationResult {
  migrated: number;
  errors: string[];
}

export class PlayerFileParser {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Migrate all player files from a legacy player directory.
   * Reads each .plr file, parses it, and imports into the database.
   */
  async migratePlayerDir(playerDir: string): Promise<PlayerMigrationResult> {
    void playerDir;
    void this.prisma;
    // TODO PARITY: Implement legacy player file parsing (Name, Paswd, Sex, Race, Class, Level sections)
// TODO: Scan directory for player files
    // Parse each file and import via PlayerRepository
    return { migrated: 0, errors: [] };
  }
}

// Suppress unused import warnings – will be used in implementation
void readdir;
