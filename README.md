# Feetback

Feetback is a product for collecting, organizing, and reviewing feedback from users inside customer web applications.

The product has three main parts:

- **Embeddable script** (`src/feetback`, built to `public/feetback.js`): a framework-free script Customers embed in their Customer App with a small settings snippet. It renders an isolated Script UI (Shadow DOM) with a feedback button and popover, captures an automatic screenshot, supports element selection and image uploads, and sends Feedback Submissions to the Feetback API.
- **Customer dashboard** (`src/app/dashboard`): where Users review grouped Feedback Issues, inspect evidence including stored screenshots and uploaded images, copy an Implementation Prompt for coding agents, and manage Customer Apps (Client Keys, Allowed Origins, and the embed snippet).
- **Landing page** (planned, `src/app/page.tsx`): the public marketing surface for the product.

## Development

```bash
pnpm install
pnpm dev        # runs `convex dev` and `next dev` together
pnpm build      # builds the embeddable script, then the Next.js app
pnpm lint       # biome check
pnpm format     # biome format
pnpm typecheck
pnpm test
```

The app requires these public environment variables:

- `NEXT_PUBLIC_CONVEX_URL` points at the Convex deployment.
- `NEXT_PUBLIC_CONVEX_SITE_URL` points at the Convex HTTP site URL.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` enables Clerk authentication for the Dashboard.

`convex dev` sets the two Convex variables in `.env.local`. Add the Clerk publishable key from the Clerk instance configured in `convex/auth.config.ts`. Without that key, the Dashboard stays in demo mode.

When `pnpm dev` starts, the built-in demo Customer App automatically includes the current Git branch and full commit hash in each Feedback Item. For another Customer App tested locally, include the source revision in the script settings:

```js
window.FeetbackSettings = {
  clientKey: "your-client-key",
  developmentContext: {
    branch: "feature/feedback-context",
    commit: "0123456789abcdef0123456789abcdef01234567"
  }
};
```

Production settings can omit `developmentContext`.

New Customer Apps start with no Allowed Origins and reject feedback until at least one origin is saved in Dashboard Settings.

Feedback submissions are limited to 10 per minute per Client Key, with a burst capacity of 3. Limited requests return HTTP `429` and a `Retry-After` header.

Useful routes once the dev server is running:

- `/demo/customer-app` — demo Customer App with the script embedded through a real script tag.
- `/dashboard` — Feetback dashboard reviewing the submitted feedback.
- `/dashboard/settings` — manage Customer Apps, Client Keys, Allowed Origins, and embed snippets.

## Docs

- `CONTEXT.md` — product glossary and shared language.
- `docs/adr` — accepted architecture decisions (Shadow DOM boundary, framework-free script runtime).
- `docs/prd` — product requirements, starting with the embeddable script v1.
