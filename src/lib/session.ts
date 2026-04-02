const TOKEN_KEY = "ultima-demo-token";
const USER_KEY = "ultima-demo-user";

export type SessionUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "player" | "coach" | "admin";
  status: string;
  createdAt: string;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    clearSession();
    return null;
  }
}
