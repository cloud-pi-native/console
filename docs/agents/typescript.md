# TypeScript

Read when writing TypeScript or changing compiler configuration.

## Compiler configuration

- Shared base: `packages/tsconfig/tsconfig.base.json` — ESNext, NodeNext, strict, `@/*` → `src/*` alias.
- Legacy server: extends the shared base and uses `ts-patch`/`tspc` for path transformation in emitted JavaScript (read-only reference).
- Client: does not extend the shared base; uses `Bundler` module resolution.
- `server-nestjs`: standalone configuration with `emitDecoratorMetadata` and `experimentalDecorators`.

## Type safety

- No `as` casts (including `as any`), no `any`, and no unchecked escapes of `unknown` that break the type-checking chain.
- Narrow with `if` type guards; include the offending identifier in error messages.
- Parse external data at the input boundary into the most precise type it allows. Return the parsed value so its type carries the proof downstream; do not repeat validation downstream or use a check-and-throw helper returning nothing.

Fix shared behavior at the common source all callers use, rather than duplicating guards in each caller.
