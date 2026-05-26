import { USER_ROLE_EMPLOYEE } from "../constants/roles";
import {
  USER_STATUS_ACTIVE,
  type UserStatusValue,
} from "../constants/status";
import type { UserItem } from "../services/userService";

export type EmployeeOption = {
  id: string;
  name: string;
  status?: UserStatusValue;
};

export type EmployeeUserLike = {
  id: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  status?: UserStatusValue;
};

export const isActiveEmployeeStatus = (status?: string): boolean =>
  status === USER_STATUS_ACTIVE;

/** Active employees first (A–Z), then inactive/suspended (A–Z). */
export const sortEmployeeOptions = (
  options: EmployeeOption[],
): EmployeeOption[] =>
  [...options].sort((a, b) => {
    const aActive = isActiveEmployeeStatus(a.status);
    const bActive = isActiveEmployeeStatus(b.status);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

export const buildEmployeeDisplayName = (user: EmployeeUserLike): string =>
  [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
  user.userName ||
  USER_ROLE_EMPLOYEE;

export const mapUsersToEmployeeOptions = (users: UserItem[]): EmployeeOption[] =>
  sortEmployeeOptions(
    users
      .filter((user) => user.role === USER_ROLE_EMPLOYEE)
      .map((user) => ({
        id: user.id,
        name: buildEmployeeDisplayName(user),
        status: user.status,
      })),
  );

export const mergeEmployeeOptions = (
  base: EmployeeOption[],
  ...extra: Array<EmployeeUserLike | null | undefined>
): EmployeeOption[] => {
  const list = [...base];
  for (const user of extra) {
    if (!user?.id) continue;
    const id = String(user.id);
    if (list.some((entry) => String(entry.id) === id)) continue;
    list.push({
      id,
      name: buildEmployeeDisplayName(user),
      status: user.status,
    });
  }
  return sortEmployeeOptions(list);
};
