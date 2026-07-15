// Vercel serverless entrypoint for the Arc Pass API.
//
// This project's frontend build alone doesn't run a server — Vercel only
// serves the Vite static output. This file re-exports the same Express app
// used by `artifacts/api-server` (unchanged) as a Vercel Node function, so
// `/api/*` requests are handled by real routes instead of 404ing against
// Vercel's static host. Vercel's file-based routing maps this file to
// `/api/*` automatically; see the root `vercel.json` for how `/uploads/*`
// is also routed here.
//
// Do not add request handling logic here — this file only wires the
// existing app into Vercel's Node runtime.
import app from "../artifacts/api-server/src/app";

export default app;
