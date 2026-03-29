/**
 * Migration module – CLI entry point and barrel export.
 *
 * Usage:
 *   tsx src/migration/index.ts areas <legacyDir> <outputDir>
 *   tsx src/migration/index.ts players <playerDir>
 *
 * Or via npm scripts:
 *   npm run migrate:areas -- <legacyDir> <outputDir>
 *   npm run migrate:players -- <playerDir>
 */

export { AreFileParser, type ParsedArea } from './AreFileParser.js';
export { PlayerFileParser, type PlayerMigrationResult } from './PlayerFileParser.js';
export { MigrationRunner } from './MigrationRunner.js';

// ---------------------------------------------------------------------------
// CLI entry point (only runs when executed directly)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'areas') {
    const legacyDir = args[1];
    const outputDir = args[2];
    if (!legacyDir || !outputDir) {
      console.error('Usage: tsx src/migration/index.ts areas <legacyDir> <outputDir>');
      process.exit(1);
    }
    console.log(`Migrating areas from ${legacyDir} to ${outputDir}...`);
    // TODO: Instantiate PrismaClient + MigrationRunner and run
    console.log('Area migration stub – not yet implemented.');
  } else if (command === 'players') {
    const playerDir = args[1];
    if (!playerDir) {
      console.error('Usage: tsx src/migration/index.ts players <playerDir>');
      process.exit(1);
    }
    console.log(`Migrating players from ${playerDir}...`);
    // TODO: Instantiate PrismaClient + MigrationRunner and run
    console.log('Player migration stub – not yet implemented.');
  } else {
    console.error('Unknown command. Usage:');
    console.error('  tsx src/migration/index.ts areas <legacyDir> <outputDir>');
    console.error('  tsx src/migration/index.ts players <playerDir>');
    process.exit(1);
  }
}

// Only run CLI when this file is the entry point
const isMainModule = process.argv[1]?.endsWith('migration/index.ts') ||
                     process.argv[1]?.endsWith('migration/index.js');
if (isMainModule) {
  main().catch((err: unknown) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
