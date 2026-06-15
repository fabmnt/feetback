import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://replace-with-clerk-issuer.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
