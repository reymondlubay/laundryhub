export const USER_STATUS_ACTIVE = "Active" as const;
export const USER_STATUS_INACTIVE = "Inactive" as const;
export const USER_STATUS_SUSPENDED = "Suspended" as const;

export const USER_STATUS_OPTIONS = [
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
  USER_STATUS_SUSPENDED,
] as const;

export type UserStatusValue = (typeof USER_STATUS_OPTIONS)[number];
