import type {
  AccessKind,
  Broadcast,
  Metrics,
  Segment,
  UserDetail,
  UserSummary,
} from "./types";

interface ApiError extends Error {
  status?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-whyspent-admin": "panel",
      ...options.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    const error = new Error(
      payload.error ?? "Не удалось выполнить действие"
    ) as ApiError;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const api = {
  session: () =>
    request<{ authenticated: boolean }>("/api/session", {
      method: "GET",
      headers: {},
    }),
  login: (password: string) =>
    request<{ ok: boolean }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/logout", { method: "POST", body: "{}" }),
  overview: () =>
    request<{ ok: true; metrics: Metrics; broadcasts: Broadcast[] }>(
      "/api/operations",
      { method: "POST", body: JSON.stringify({ action: "overview" }) }
    ),
  users: (page: number, search: string, segment: string) =>
    request<{
      ok: true;
      users: UserSummary[];
      total: number;
      page: number;
      pageSize: number;
    }>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "users", page, search, segment }),
    }),
  user: (userId: string) =>
    request<{ ok: true } & UserDetail>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "user", userId }),
    }),
  adjustAccess: (userId: string, kind: AccessKind, days: number) =>
    request<{ ok: true }>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "adjust_access", userId, kind, days }),
    }),
  revokeAccess: (userId: string) =>
    request<{ ok: true }>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "revoke_access", userId }),
    }),
  revokeTokens: (userId: string) =>
    request<{ ok: true }>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "revoke_tokens", userId }),
    }),
  audience: (segment: Segment) =>
    request<{ ok: true; count: number }>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "audience", segment }),
    }),
  testBroadcast: (segment: Segment, message: string) =>
    request<{ ok: true; testId: string }>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "broadcast_test", segment, message }),
    }),
  createBroadcast: (segment: Segment, message: string, testId: string) =>
    request<{ ok: true; broadcastId: string; audienceSize: number }>(
      "/api/operations",
      {
        method: "POST",
        body: JSON.stringify({
          action: "create_broadcast",
          segment,
          message,
          testId,
        }),
      }
    ),
  processBroadcast: (broadcastId: string) =>
    request<{
      ok: true;
      sent: number;
      failed: number;
      pending: number;
      status: Broadcast["status"];
    }>("/api/operations", {
      method: "POST",
      body: JSON.stringify({ action: "process_broadcast", broadcastId }),
    }),
};
