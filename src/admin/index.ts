/**
 * Admin modules barrel export.
 */

export {
  TRUST_LEVELS,
  type TrustLevel,
  isImmortal,
  isHero,
  getTrustName,
} from './TrustLevels.js';

export {
  BanSystem,
  type BanEntry,
} from './BanSystem.js';

export {
  createAdminRouter,
  clearRateLimits,
  type AdminJwtPayload,
  type AdminRequest,
  type OnlinePlayerInfo,
  type PlayerInfoProvider,
  type AreaInfoProvider,
  type SystemOpsProvider,
  type AdminRouterDeps,
} from './AdminRouter.js';

export {
  AuthController,
  type AdminTokenPayload,
  type PlayerCredentials,
  type CredentialLookupFn,
  MIN_ADMIN_TRUST,
  TOKEN_EXPIRY_SECONDS,
  BCRYPT_SALT_ROUNDS,
} from './AuthController.js';

export {
  MonitoringController,
  MAX_AUDIT_LOG_SIZE,
  type ServerStats,
  type AuditLogEntry,
  type MetricsProviders,
} from './MonitoringController.js';

export {
  createDashboardRouter,
  dashboardPage,
  playersPage,
  areasPage,
  logsPage,
} from './DashboardUI.js';
