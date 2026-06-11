export type AdminPermission =
  | "dashboard:read"
  | "users:read"
  | "users:write"
  | "roles:write"
  | "vendors:read"
  | "vendors:write"
  | "kyc:review"
  | "orders:read"
  | "orders:write"
  | "reviews:moderate"
  | "payments:read"
  | "refunds:write"
  | "catalog:write"
  | "marketing:write"
  | "billing:write"
  | "settings:write"
  | "audit:read"
  | "ops:read"
  | "subscriptions:read"
  | "notifications:write"
  | "media:write";

export type AdminUser = {
  publicId?: string;
  id?: string | number;
  name?: string;
  fullName?: string;
  email?: string;
  accountType?: string;
  roles?: Array<string | { name?: string; code?: string; slug?: string }>;
  permissions?: string[];
};

export const superAdminPermissions: AdminPermission[] = [
  "dashboard:read",
  "users:read",
  "users:write",
  "roles:write",
  "vendors:read",
  "vendors:write",
  "kyc:review",
  "orders:read",
  "orders:write",
  "reviews:moderate",
  "payments:read",
  "refunds:write",
  "catalog:write",
  "marketing:write",
  "billing:write",
  "settings:write",
  "audit:read",
  "ops:read",
];

const readOnlyAdminPermissions: AdminPermission[] = [
  "dashboard:read",
  "users:read",
  "vendors:read",
  "orders:read",
  "payments:read",
  "audit:read",
  "ops:read",
];

const adminRoleCodes = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "OWNER",
  "STAFF_ADMIN",
]);

const superAdminRoleCodes = new Set(["SUPER_ADMIN", "OWNER"]);

export function getRoleNames(user: AdminUser | null | undefined) {
  return (user?.roles ?? [])
    .map((role) => {
      if (typeof role === "string") return role;
      return role.code ?? role.name ?? role.slug ?? "";
    })
    .filter(Boolean)
    .map((role) => role.trim().toUpperCase().replace(/[\s-]+/g, "_"));
}

export function isSuperAdminUser(user: AdminUser | null | undefined) {
  if (user?.email === "admin@yalla.app") return true;
  return getRoleNames(user).some((role) => superAdminRoleCodes.has(role));
}

export function isAdminUser(user: AdminUser | null | undefined): user is AdminUser {
  if (!user) return false;
  if (String(user.accountType ?? "").toUpperCase() === "ADMIN") return true;
  return getRoleNames(user).some((role) => adminRoleCodes.has(role));
}

export function permissionsForUser(user: AdminUser | null | undefined) {
  if (!isAdminUser(user)) return [];

  const explicit = (user?.permissions ?? []).filter((permission) =>
    superAdminPermissions.includes(permission as AdminPermission),
  ) as AdminPermission[];

  if (explicit.length > 0) return explicit;
  if (isSuperAdminUser(user)) return superAdminPermissions;

  return readOnlyAdminPermissions;
}

export function hasPermission(
  user: AdminUser | null | undefined,
  permission: AdminPermission,
) {
  return permissionsForUser(user).includes(permission);
}
