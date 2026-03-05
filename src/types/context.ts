export type ProviderKey = "bi" | "pm" | "ticketing" | "approval" | (string & {});

export interface RequestContext {
  provider: ProviderKey;
  tenantId: string;
  userId: string;
  role: "member" | "admin";
  signedIn: boolean;
  userName: string;
}
