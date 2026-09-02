// Central place for TSL's role model. Roles live in the SAME Clerk
// publicMetadata.role field get-plot already uses (see middleware.js +
// app/(dashboard)/layout.jsx) — these are just new values for that field,
// so a get-plot "sysadmin" account gets access here with zero extra setup.

export const ROLES = {
  SYSADMIN: "sysadmin",
  TSL_ADMIN: "tsl_admin",
  TSL_SECRETARY: "tsl_secretary",
  TSL_SURVEYOR: "tsl_surveyor",
  TSL_QUEEN: "tsl_queen",
  TSL_CHIEF: "tsl_chief",
};

export const ALL_TSL_ROLES = [
  ROLES.SYSADMIN,
  ROLES.TSL_ADMIN,
  ROLES.TSL_SECRETARY,
  ROLES.TSL_SURVEYOR,
  ROLES.TSL_QUEEN,
  ROLES.TSL_CHIEF,
];

// Roles that are allowed to sign in at all. Anyone else with a valid Clerk
// session (e.g. an ordinary get-plot marketplace customer, since this app
// shares get-plot's Clerk instance) gets bounced to /unauthorized.
export const ALLOWED_ROLES = ALL_TSL_ROLES;

export const ROLE_LABELS = {
  [ROLES.SYSADMIN]: "Sysadmin",
  [ROLES.TSL_ADMIN]: "Administrator",
  [ROLES.TSL_SECRETARY]: "Secretary",
  [ROLES.TSL_SURVEYOR]: "Surveyor",
  [ROLES.TSL_QUEEN]: "Queen",
  [ROLES.TSL_CHIEF]: "Chief",
};

// v1 permission matrix — deliberately one small object so it's cheap to
// adjust as the real workflow gets confirmed. Queen/Chief default to
// oversight (view everything, including audit trail, for transparency) but
// don't perform allocations/transfers or manage staff accounts themselves.
// editPlots controls plot metadata/status updates and the owner split.
// Secretaries may edit plots as part of their operational duties; only
// sysadmins can grant roles and manage staff.
const PERMISSIONS = {
  [ROLES.SYSADMIN]: { allocate: true, transfer: true, manageUsers: true, grantSysadmin: true, editPlots: true },
  [ROLES.TSL_ADMIN]: { allocate: true, transfer: true, manageUsers: true, grantSysadmin: false, editPlots: false },
  [ROLES.TSL_SECRETARY]: { allocate: true, transfer: true, manageUsers: false, grantSysadmin: false, editPlots: true },
  [ROLES.TSL_SURVEYOR]: { allocate: true, transfer: true, manageUsers: false, grantSysadmin: false, editPlots: false },
  [ROLES.TSL_QUEEN]: { allocate: false, transfer: false, manageUsers: false, grantSysadmin: false, editPlots: false },
  [ROLES.TSL_CHIEF]: { allocate: false, transfer: false, manageUsers: false, grantSysadmin: false, editPlots: false },
};

export function can(role, permission) {
  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : role;
  return Boolean(PERMISSIONS[normalizedRole]?.[permission]);
}

export function getEffectiveRole(clerkUser) {
  const role = clerkUser?.publicMetadata?.role;
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

export function isAllowedRole(role) {
  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : role;
  return ALLOWED_ROLES.includes(normalizedRole);
}

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? "Unknown";
}
