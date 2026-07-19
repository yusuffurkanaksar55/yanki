# ADR-0001 - Use React, Vite, TypeScript, and Supabase

## Status

Accepted

## Context

The platform needs a maintainable web application stack with strong frontend type safety, accessible UI development, managed authentication, PostgreSQL, trusted server-side functions, and Row Level Security.

## Decision

Use React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase PostgreSQL, Supabase Auth, Supabase Edge Functions, and Supabase Row Level Security as the target stack.

## Alternatives considered

- Next.js with custom backend: powerful but adds server/runtime complexity that is not required for the initial internal application.
- Custom PostgreSQL and custom auth service: increases operational and security burden.
- Firebase: less aligned with relational authorization and reporting requirements.

## Consequences

- The project can use PostgreSQL constraints and RLS for defense in depth.
- Supabase Edge Functions provide a trusted server boundary for encryption and authorization.
- The frontend can remain focused on Turkish user workflows and accessibility.

## Security impact

Positive, if service-role credentials and encryption keys remain server-side and RLS is configured default-deny.

## Migration impact

No migration impact yet because no runtime schema exists.
