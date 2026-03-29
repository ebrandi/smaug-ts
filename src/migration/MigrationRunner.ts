/**
 * MigrationRunner – Orchestrates legacy data migration.
 *
 * Coordinates AreFileParser and PlayerFileParser to migrate an entire
 * legacy SMAUG installation into the new TypeScript engine's database
 * and file formats. Provides progress reporting and error recovery.
 *
 * @stub Phase 2b implementation
 */

import { AreFileParser } from './AreFileParser.js';
import { PlayerFileParser } from './PlayerFileParser.js';

export class MigrationRunner {
  private readonly areaParser: AreFileParser;
  private readonly playerParser: PlayerFileParser;

  constructor(prisma: unknown) {
    this.areaParser = new AreFileParser();
    // PlayerFileParser expects PrismaClient; cast for now
    this.playerParser = new PlayerFileParser(prisma as never);
  }

  /**
   * Migrate all .are files from a legacy area directory.
   * Parses each file and writes JSON output to the target directory.
   */
  async migrateAreas(legacyDir: string, outputDir: string): Promise<void> {
    void legacyDir;
    void outputDir;
    void this.areaParser;
    // TODO PARITY: Implement migration orchestration with progress reporting and error recovery
// TODO: Scan legacyDir for .are files
    // Parse each file with AreFileParser
    // Write output with writeToJson
  }

  /**
   * Migrate all player files from a legacy player directory.
   * Parses each file and imports into the database.
   */
  async migratePlayers(playerDir: string): Promise<void> {
    void playerDir;
    void this.playerParser;
    // TODO PARITY: Implement migration orchestration with progress reporting and error recovery
// TODO: Delegate to PlayerFileParser.migratePlayerDir
  }
}
