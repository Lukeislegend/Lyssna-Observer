/**
 * Lyssna migration seam: swap for real auth / org context.
 */
export type IdentityContext = {
  userId: string;
  email?: string;
};

export function getStubResearcherIdentity(): IdentityContext {
  return { userId: "researcher-demo", email: "researcher@example.com" };
}
