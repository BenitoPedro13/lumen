"use server";

import { getSessionToken } from "./session";

const API_URL = process.env.LUMEN_API_URL || "http://localhost:3000";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function apiCall<T>(
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<ApiResponse<T>> {
  try {
    const token = await getSessionToken();

    const response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return { ok: false, error: error.error || "Request failed" };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    console.error(`API call failed: ${method} ${path}`, err);
    return { ok: false, error: "Network error" };
  }
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return apiCall<T>("GET", path);
}

export async function apiPost<T>(path: string, body: Record<string, any>): Promise<ApiResponse<T>> {
  return apiCall<T>("POST", path, body);
}

export async function apiPatch<T>(path: string, body: Record<string, any>): Promise<ApiResponse<T>> {
  return apiCall<T>("PATCH", path, body);
}

export async function verifyToken<T>(token: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return { ok: false, error: error.error || "Invalid token" };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    console.error("Token verification failed", err);
    return { ok: false, error: "Network error" };
  }
}
