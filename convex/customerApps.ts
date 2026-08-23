import { ConvexError, v } from "convex/values";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { getViewerCustomerId } from "./dashboard";

const CLIENT_KEY_PREFIX = "fbk";
const CLIENT_KEY_RANDOM_LENGTH = 24;
const ORIGIN_PROTOCOLS = new Set(["http:", "https:"]);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const customerId = await getViewerCustomerId(ctx);

    if (!customerId) {
      return [];
    }

    return await ctx.db
      .query("customerApps")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(50);
  },
});

export const createCustomerApp = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const customerId = await requireViewerCustomerId(ctx);
    const name = args.name.trim();

    if (!name) {
      throw new ConvexError("Customer App name is required.");
    }

    const customerAppId = await ctx.db.insert("customerApps", {
      customerId,
      name,
      clientKey: generateClientKey(),
      allowedOrigins: [],
    });

    return await ctx.db.get(customerAppId);
  },
});

export const updateCustomerApp = mutation({
  args: {
    customerAppId: v.id("customerApps"),
    name: v.string(),
    allowedOrigins: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const customerId = await requireViewerCustomerId(ctx);
    const app = await ctx.db.get(args.customerAppId);

    if (!app || app.customerId !== customerId) {
      throw new ConvexError("Unknown Customer App.");
    }

    const name = args.name.trim();

    if (!name) {
      throw new ConvexError("Customer App name is required.");
    }

    const { origins, invalidOrigins } = normalizeAllowedOrigins(
      args.allowedOrigins,
    );

    if (invalidOrigins.length > 0) {
      throw new ConvexError(
        `Invalid Allowed Origins: ${invalidOrigins.join(", ")}`,
      );
    }

    await ctx.db.patch(app._id, { name, allowedOrigins: origins });

    return await ctx.db.get(app._id);
  },
});

async function requireViewerCustomerId(ctx: QueryCtx) {
  const customerId = await getViewerCustomerId(ctx);

  if (!customerId) {
    throw new ConvexError("No Customer is available for this dashboard.");
  }

  return customerId;
}

function generateClientKey() {
  const bytes = crypto.getRandomValues(
    new Uint8Array(CLIENT_KEY_RANDOM_LENGTH / 2),
  );
  const random = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${CLIENT_KEY_PREFIX}_${random}`;
}

// Allowed Origins must match the origin format browsers send in the Origin
// header (protocol://host[:port]) so submissions can be compared exactly.
function normalizeAllowedOrigins(values: string[]) {
  const origins: string[] = [];
  const invalidOrigins: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed) {
      continue;
    }

    let origin: string | null = null;

    try {
      const url = new URL(trimmed);
      const isPlainOrigin =
        ORIGIN_PROTOCOLS.has(url.protocol) &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash;
      origin = isPlainOrigin ? url.origin : null;
    } catch {
      origin = null;
    }

    if (origin && !origins.includes(origin)) {
      origins.push(origin);
    } else if (!origin) {
      invalidOrigins.push(trimmed);
    }
  }

  return { origins, invalidOrigins };
}
