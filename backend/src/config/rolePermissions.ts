/**
 * Role-to-permissions mapping — single source of truth.
 * Maps each backend UserRole to its default UserPermissions shape.
 * Individual users can override via their per-field permission booleans in the DB.
 */
import { UserPermissions } from '../types';

// Matches the Prisma UserRole enum
export type BackendRole =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'PHYSICIAN'
  | 'NURSE_MANAGER'
  | 'QUALITY_DIRECTOR'
  | 'ANALYST'
  | 'VIEWER';

/**
 * Default permission templates per role.
 * "assigned" module access is determined by the user's individual perm* booleans.
 * These defaults only apply when a user doesn't have explicit overrides.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<BackendRole, UserPermissions> = {
  SUPER_ADMIN: {
    modules: {
      heartFailure: true,
      electrophysiology: true,
      structuralHeart: true,
      coronaryIntervention: true,
      peripheralVascular: true,
      valvularDisease: true,
    },
    views: { executive: true, serviceLines: true, careTeam: true },
    actions: {
      viewReports: true,
      exportData: true,
      manageUsers: true,
      configureAlerts: true,
      accessPHI: true,
    },
  },
  HOSPITAL_ADMIN: {
    modules: {
      heartFailure: true,
      electrophysiology: true,
      structuralHeart: true,
      coronaryIntervention: true,
      peripheralVascular: true,
      valvularDisease: true,
    },
    views: { executive: true, serviceLines: true, careTeam: true },
    actions: {
      viewReports: true,
      exportData: true,
      manageUsers: true,
      configureAlerts: true,
      accessPHI: true,
    },
  },
  PHYSICIAN: {
    modules: {
      heartFailure: false,
      electrophysiology: false,
      structuralHeart: false,
      coronaryIntervention: false,
      peripheralVascular: false,
      valvularDisease: false,
    },
    views: { executive: false, serviceLines: true, careTeam: true },
    actions: {
      viewReports: true,
      exportData: false,
      manageUsers: false,
      configureAlerts: false,
      accessPHI: true,
    },
  },
  NURSE_MANAGER: {
    modules: {
      heartFailure: false,
      electrophysiology: false,
      structuralHeart: false,
      coronaryIntervention: false,
      peripheralVascular: false,
      valvularDisease: false,
    },
    views: { executive: false, serviceLines: false, careTeam: true },
    actions: {
      viewReports: true,
      exportData: false,
      manageUsers: false,
      configureAlerts: false,
      accessPHI: true,
    },
  },
  QUALITY_DIRECTOR: {
    modules: {
      heartFailure: false,
      electrophysiology: false,
      structuralHeart: false,
      coronaryIntervention: false,
      peripheralVascular: false,
      valvularDisease: false,
    },
    views: { executive: true, serviceLines: true, careTeam: false },
    actions: {
      viewReports: true,
      exportData: true,
      manageUsers: false,
      configureAlerts: true,
      accessPHI: false,
    },
  },
  ANALYST: {
    modules: {
      heartFailure: false,
      electrophysiology: false,
      structuralHeart: false,
      coronaryIntervention: false,
      peripheralVascular: false,
      valvularDisease: false,
    },
    views: { executive: false, serviceLines: true, careTeam: false },
    actions: {
      viewReports: true,
      exportData: true,
      manageUsers: false,
      configureAlerts: false,
      accessPHI: false,
    },
  },
  VIEWER: {
    modules: {
      heartFailure: false,
      electrophysiology: false,
      structuralHeart: false,
      coronaryIntervention: false,
      peripheralVascular: false,
      valvularDisease: false,
    },
    views: { executive: false, serviceLines: true, careTeam: false },
    actions: {
      viewReports: true,
      exportData: false,
      manageUsers: false,
      configureAlerts: false,
      accessPHI: false,
    },
  },
};

/**
 * Module key map: URL slug → permission key
 */
export const MODULE_KEY_MAP: Record<string, keyof UserPermissions['modules']> = {
  'heart-failure': 'heartFailure',
  'hf': 'heartFailure',
  'electrophysiology': 'electrophysiology',
  'ep': 'electrophysiology',
  'structural-heart': 'structuralHeart',
  'structural': 'structuralHeart',
  'coronary-intervention': 'coronaryIntervention',
  'coronary': 'coronaryIntervention',
  'peripheral-vascular': 'peripheralVascular',
  'peripheral': 'peripheralVascular',
  'valvular-disease': 'valvularDisease',
  'valvular': 'valvularDisease',
};

/**
 * Build a user's effective permissions by merging:
 * 1. Role defaults (from DEFAULT_ROLE_PERMISSIONS)
 * 2. User-specific overrides (from DB boolean fields)
 * 3. Hospital module subscriptions (gates what modules are available)
 */
export function buildUserPermissions(
  user: {
    role: string;
    permHeartFailure: boolean;
    permElectrophysiology: boolean;
    permStructuralHeart: boolean;
    permCoronaryIntervention: boolean;
    permPeripheralVascular: boolean;
    permValvularDisease: boolean;
    permExecutiveView: boolean;
    permServiceLineView: boolean;
    permCareTeamView: boolean;
    permViewReports: boolean;
    permExportData: boolean;
    permManageUsers: boolean;
    permConfigureAlerts: boolean;
    permAccessPHI: boolean;
  },
  hospital?: {
    moduleHeartFailure?: boolean;
    moduleElectrophysiology?: boolean;
    moduleStructuralHeart?: boolean;
    moduleCoronaryIntervention?: boolean;
    modulePeripheralVascular?: boolean;
    moduleValvularDisease?: boolean;
  }
): UserPermissions {
  const roleKey = user.role as BackendRole;
  const defaults = DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS.VIEWER;

  // For SUPER_ADMIN and HOSPITAL_ADMIN, use role defaults for modules.
  // For other roles, use the user's individual module permission booleans.
  const isAdmin = roleKey === 'SUPER_ADMIN' || roleKey === 'HOSPITAL_ADMIN';

  const modules = {
    heartFailure: isAdmin ? true : user.permHeartFailure,
    electrophysiology: isAdmin ? true : user.permElectrophysiology,
    structuralHeart: isAdmin ? true : user.permStructuralHeart,
    coronaryIntervention: isAdmin ? true : user.permCoronaryIntervention,
    peripheralVascular: isAdmin ? true : user.permPeripheralVascular,
    valvularDisease: isAdmin ? true : user.permValvularDisease,
  };

  // Intersect with hospital subscriptions (if hospital doesn't have a module, nobody gets it)
  if (hospital) {
    if (hospital.moduleHeartFailure === false) modules.heartFailure = false;
    if (hospital.moduleElectrophysiology === false) modules.electrophysiology = false;
    if (hospital.moduleStructuralHeart === false) modules.structuralHeart = false;
    if (hospital.moduleCoronaryIntervention === false) modules.coronaryIntervention = false;
    if (hospital.modulePeripheralVascular === false) modules.peripheralVascular = false;
    if (hospital.moduleValvularDisease === false) modules.valvularDisease = false;
  }

  // Views: admins get all, others use their DB booleans merged with role defaults
  const views = {
    executive: isAdmin ? true : (user.permExecutiveView || defaults.views.executive),
    serviceLines: isAdmin ? true : (user.permServiceLineView || defaults.views.serviceLines),
    careTeam: isAdmin ? true : (user.permCareTeamView || defaults.views.careTeam),
  };

  // Actions: admins get all, others use their DB booleans merged with role defaults
  const actions = {
    viewReports: isAdmin ? true : (user.permViewReports || defaults.actions.viewReports),
    exportData: isAdmin ? true : (user.permExportData || defaults.actions.exportData),
    manageUsers: isAdmin ? true : (user.permManageUsers || defaults.actions.manageUsers),
    configureAlerts: isAdmin ? true : (user.permConfigureAlerts || defaults.actions.configureAlerts),
    accessPHI: isAdmin ? true : (user.permAccessPHI || defaults.actions.accessPHI),
  };

  return { modules, views, actions };
}

/**
 * Full-access permissions for demo/super-admin bypass
 */
export const FULL_ACCESS_PERMISSIONS: UserPermissions = DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN;
