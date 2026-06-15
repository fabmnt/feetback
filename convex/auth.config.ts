import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://clever-flamingo-35.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
