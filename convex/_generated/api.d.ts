/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as customerApps from "../customerApps.js";
import type * as dashboard from "../dashboard.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as lib_gemini from "../lib/gemini.js";
import type * as lib_issues from "../lib/issues.js";
import type * as lib_triageConfig from "../lib/triageConfig.js";
import type * as lib_triageDecision from "../lib/triageDecision.js";
import type * as rateLimit from "../rateLimit.js";
import type * as triage from "../triage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  customerApps: typeof customerApps;
  dashboard: typeof dashboard;
  feedback: typeof feedback;
  http: typeof http;
  "lib/gemini": typeof lib_gemini;
  "lib/issues": typeof lib_issues;
  "lib/triageConfig": typeof lib_triageConfig;
  "lib/triageDecision": typeof lib_triageDecision;
  rateLimit: typeof rateLimit;
  triage: typeof triage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
