import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { authError, validateAuth } from "../services/authValidation";
import {
  createAuthority,
  readIdentity,
  type AccessState,
} from "../services/admin/access";

export const useAuthStore = defineStore("auth", () => {
  const session = shallowRef<Session | null>(null),
    role = ref<"user" | "admin" | null>(null);
  const initialized = ref(false),
    loading = ref(false),
    recovery = ref(false);
  const user = computed(() => session.value?.user ?? null);
  const configured = Boolean(supabase);
  let initialization: Promise<void> | undefined;
  const adminStatus = ref<AccessState>("idle");
  const authority = createAuthority(
    () =>
      session.value
        ? { id: session.value.user.id, token: session.value.access_token }
        : null,
    (identity, signal) =>
      readIdentity(import.meta.env.VITE_API_URL || "", identity, signal),
    (state) => {
      adminStatus.value = state;
      role.value = state === "admin" || state === "user" ? state : null;
    },
  );
  const verifiedAdmin = computed(
    () => adminStatus.value === "admin" && authority.isAdmin(),
  );
  function accept(next: Session | null) {
    session.value = next;
    role.value = null;
    authority.invalidate();
    if (!next) recovery.value = false;
  }
  function refreshRole() {
    return authority.verify();
  }
  function rejectAdminAccess(
    state: "unauthorized" | "forbidden" | "unavailable",
  ) {
    authority.invalidate(state);
  }
  let adminRefresh: Promise<boolean> | undefined;
  function refreshAdminSession(): Promise<boolean> {
    if (adminRefresh) return adminRefresh;
    if (!supabase || !session.value) return Promise.resolve(false);
    adminRefresh = (async () => {
      try {
        const { data, error } = await supabase!.auth.refreshSession();
        if (error || !data.session) {
          rejectAdminAccess("unauthorized");
          return false;
        }
        accept(data.session);
        return true;
      } catch {
        rejectAdminAccess("unauthorized");
        return false;
      } finally {
        adminRefresh = undefined;
      }
    })();
    return adminRefresh;
  }
  function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      if (!supabase) {
        initialized.value = true;
        return;
      }
      supabase.auth.onAuthStateChange((event, next) => {
        accept(next);
        if (event === "PASSWORD_RECOVERY") recovery.value = true;
        // Keep the callback synchronous to avoid the Supabase auth lock deadlocking.
        setTimeout(() => void refreshRole(), 0);
      });
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error) accept(data.session);
      } catch {
        accept(null);
      } finally {
        initialized.value = true;
      }
      void refreshRole();
    })();
    return initialization;
  }
  async function execute(action: () => Promise<string | null>) {
    if (!supabase) return "unavailable";
    if (loading.value) return "busy";
    loading.value = true;
    try {
      return await action();
    } catch (error) {
      return authError(error);
    } finally {
      loading.value = false;
    }
  }
  async function register(
    email: string,
    password: string,
    repeat: string,
    consent: boolean,
  ) {
    const errors = validateAuth("register", email, password, repeat, consent);
    if (Object.keys(errors).length) return Object.values(errors)[0]!;
    return execute(async () => {
      // No role, profile or password metadata. The database trigger assigns 'user'.
      const { data, error } = await supabase!.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: new URL("/login", window.location.origin).href,
          data: {
            privacy_accepted: true,
            privacy_policy_path: "/privatuma-politika",
          },
        },
      });
      if (error) return authError(error);
      // Confirmation-required/missing-session responses are configuration failures, not authenticated success.
      if (!data.session) return "registrationUnavailable";
      accept(data.session);
      await refreshRole();
      return null;
    });
  }
  async function login(email: string, password: string) {
    return execute(async () => {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return authError(error);
      accept(data.session);
      await refreshRole();
      return null;
    });
  }
  async function logout() {
    return execute(async () => {
      const { error } = await supabase!.auth.signOut();
      if (error) return authError(error);
      accept(null);
      return null;
    });
  }
  async function forgotPassword(email: string) {
    return execute(async () => {
      const { error } = await supabase!.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: new URL("/reset-password", window.location.origin).href },
      );
      // Supabase normally returns success for both known and unknown addresses.
      // Do not turn delivery/configuration/CAPTCHA failures into fake success.
      if (error && error.code !== "user_not_found") return authError(error);
      return null;
    });
  }
  async function resetPassword(password: string, repeat: string) {
    const errors = validateAuth("reset", "", password, repeat, true);
    if (Object.keys(errors).length) return Object.values(errors)[0]!;
    if (!recovery.value || !session.value) return "recoveryInvalid";
    return execute(async () => {
      const { error } = await supabase!.auth.updateUser({ password });
      if (error) return authError(error);
      recovery.value = false;
      return null;
    });
  }
  return {
    session,
    user,
    role,
    initialized,
    loading,
    recovery,
    configured,
    initialize,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    refreshRole,
    adminStatus,
    verifiedAdmin,
    rejectAdminAccess,
    refreshAdminSession,
  };
});
