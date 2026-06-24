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

## Package manager
Use `pnpm` as the package manager and scripts runner.

## Testing
Don't create new tests AT ALL if user doesn't request it.

## Code quality and checks
Run the following check commands after any code changes:
- `pnpm run format`
- `pnpm run lint`
- `pnpm run typecheck`

Code quality you MUST follow:

- Always fix lint issues and don't disable linter rules only if completely necessary. Trust the changes made by the linter, do not revert them.
- Write simple and scalable code, don't overload components with business logic and extract it into separate lib, hooks, or services.
- Always use one source of truth for data types. If you need other data types derive them from the one source of truth. Trust the typescript types and interfaces, don't write runtime type checks like `if (typeof value === 'string') { ... }`. Always prefer type inference and let compiler catch type errors.
- Don't use magic strings or numbers, use named constants instead, and if it's going to be reused, extract it into a config file. E.g. query keys must be extracted into a separated config file based on the entity they are querying.
- Don't create big files, and if you find out modifying big files, split them into smaller ones with single responsability.
- Don't write small utility functions or methods that only contain a single expression or only a few lines of code. Instead write the functionality right where it's needed.
