<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Feetback
Feetback helps customers get detailed and categoryzed feedback from their users.
Feetback stands out for its easy set up, customers just register their app in the Feetback Dashboard, add a minimal script tag in their web app and just like that start collecting valuable and detailed and valuable feedback from their users.

Feetback's script is easy to set up and must not interfere at all with customer's app business logic. It's a subtle floating fedback button that can be used by their users whenever they have a problem. The trigger of the feedback input panel can be customized to integrate better with customer's app.

Feetback's Dashboard goal is to show all the feedback sent by the customer's users in an easy to digest way. It must be easy to see important feedback and feedback must be well categorized.

## Package Manager
Use `pnpm` as this project package manager and script runner.

## Quality checks
Run the following commands to check your code changes:
- `pnpm run format`
- `pnpm run lint`
- `pnpm run typecheck`

## Glossary
Read CONTEXT.md to get the glossary of concepts used in this project.
