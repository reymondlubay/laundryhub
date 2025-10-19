import route from "../constants/route";
import { storage, storageKey } from "./storage";

export type TAuthGuard = {
  failCondition: boolean;
  requestDone: boolean;
  onFail: string | null;
};

const authGuard: TAuthGuard = {
  failCondition: !storage.getToken(storageKey.TOKEN),
  requestDone: true,
  onFail: route.LOGIN,
};

const unAuthGuard = {
  failCondition: !!storage.getToken(storageKey.TOKEN),
  requestDone: true,
  onFail: route.DASHBOARD,
};

export { authGuard, unAuthGuard };
