import { RoleName } from "@relatax/types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isStaff: boolean;
  roles: RoleName[];
  businessIds: string[];
  staffBusinessIds: string[];
  mfaEnabled: boolean;
  phone: string | null;
  /** The session (JwtPayload.sid) the current access token belongs to, if any. */
  sessionId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  isStaff: boolean;
  roles: RoleName[];
  /** UserSession id — omitted from tokens issued before session tracking existed. */
  sid?: string;
}
