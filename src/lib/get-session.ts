import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { getSessionForApi } from "./auth-mobile";

export type SessionLike = { user: { id: string; email?: string | null; name?: string | null } };

export async function getSession(request: Request): Promise<SessionLike | null> {
  const webSession = await getServerSession(authOptions);
  if (webSession?.user?.id) return webSession;

  const mobileSession = await getSessionForApi(request);
  return mobileSession;
}
