export function sessionCookie(token: string, expiresAt: Date, persistent = true) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const persistence = persistent ? `; Max-Age=${maxAge}` : "";
  return `${process.env.NODE_ENV === "production" ? "__Host-life_session" : "life_session"}=${token}; Path=/; HttpOnly; SameSite=Lax${persistence}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${process.env.NODE_ENV === "production" ? "__Host-life_session" : "life_session"}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
