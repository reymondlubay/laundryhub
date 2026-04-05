export const USER_ROLE_ADMIN = "Admin" as const;
export const USER_ROLE_EMPLOYEE = "Employee" as const;

export const USER_ROLE_OPTIONS = [USER_ROLE_ADMIN, USER_ROLE_EMPLOYEE] as const;

export type UserRoleValue = (typeof USER_ROLE_OPTIONS)[number];
