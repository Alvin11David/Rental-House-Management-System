---
name: OpenAPI date-only values
description: Boundary handling for OpenAPI date-only strings in Drizzle-backed endpoints.
---

Normalize OpenAPI date-only inputs explicitly at the route boundary before persisting them through Drizzle date columns configured in string mode. Keep request and response conversions consistent.

**Why:** Generated client types, server validators, and Drizzle schemas can represent the same date format differently; implicit conversion caused type and persistence friction.

**How to apply:** For date-only fields, verify generated client types, parsed server values, and the database column mode together. Add explicit normalization at the boundary and verify the API round trip.
