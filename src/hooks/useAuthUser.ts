import { useSyncExternalStore } from "react";

import {
  getStoredUser,
  subscribeToAuthUser,
} from "../auth/user.store";

import type {
  AuthUser,
} from "../auth/user.store";

export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(
    subscribeToAuthUser,
    getStoredUser,
    () => null
  );
}