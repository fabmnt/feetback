import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.*s");

function createTestConvex() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

function createSubmission(
  clientKey: string,
  content: string,
  developmentContext?: { branch: string; commit: string },
) {
  return {
    clientKey,
    content,
    type: "bug_report",
    ...(developmentContext ? { developmentContext } : {}),
    pageContext: {
      url: "https://customer.example/settings",
    },
  };
}

describe("Convex feedback ingestion", () => {
  it("stores each submission under the Customer App selected by its Client Key", async () => {
    const t = createTestConvex();
    const targets = await t.run(async (ctx) => {
      const firstCustomerId = await ctx.db.insert("customers", {
        name: "First Customer",
        slug: "first-customer",
      });
      const firstAppId = await ctx.db.insert("customerApps", {
        customerId: firstCustomerId,
        name: "First App",
        clientKey: "fbk_first",
        allowedOrigins: ["https://first.example"],
      });
      const secondCustomerId = await ctx.db.insert("customers", {
        name: "Second Customer",
        slug: "second-customer",
      });
      const secondAppId = await ctx.db.insert("customerApps", {
        customerId: secondCustomerId,
        name: "Second App",
        clientKey: "fbk_second",
        allowedOrigins: ["https://second.example"],
      });

      return { firstAppId, firstCustomerId, secondAppId, secondCustomerId };
    });

    const firstResponse = await t.fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://first.example",
      },
      body: JSON.stringify(
        createSubmission("fbk_first", "The first app crashes."),
      ),
    });
    const secondResponse = await t.fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://second.example",
      },
      body: JSON.stringify(
        createSubmission("fbk_second", "The second app crashes.", {
          branch: "feature/first-app-crash",
          commit: "1234567",
        }),
      ),
    });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    const storedItems = await t.run(async (ctx) => {
      const firstItems = await ctx.db
        .query("feedbackItems")
        .withIndex("by_customerAppId", (q) =>
          q.eq("customerAppId", targets.firstAppId),
        )
        .take(10);
      const secondItems = await ctx.db
        .query("feedbackItems")
        .withIndex("by_customerAppId", (q) =>
          q.eq("customerAppId", targets.secondAppId),
        )
        .take(10);

      return { firstItems, secondItems };
    });

    expect(storedItems.firstItems).toHaveLength(1);
    expect(storedItems.firstItems[0]).toMatchObject({
      clientKey: "fbk_first",
      customerAppId: targets.firstAppId,
      customerId: targets.firstCustomerId,
      content: "The first app crashes.",
    });
    expect(storedItems.secondItems).toHaveLength(1);
    expect(storedItems.secondItems[0]).toMatchObject({
      clientKey: "fbk_second",
      customerAppId: targets.secondAppId,
      customerId: targets.secondCustomerId,
      content: "The second app crashes.",
      developmentContext: {
        branch: "feature/first-app-crash",
        commit: "1234567",
      },
    });
  });

  it("rejects a Client Key used from an unapproved origin", async () => {
    const t = createTestConvex();

    await t.run(async (ctx) => {
      const customerId = await ctx.db.insert("customers", {
        name: "Origin Customer",
        slug: "origin-customer",
      });
      await ctx.db.insert("customerApps", {
        customerId,
        name: "Origin App",
        clientKey: "fbk_origin",
        allowedOrigins: ["https://approved.example"],
      });
    });

    const response = await t.fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://unapproved.example",
      },
      body: JSON.stringify(
        createSubmission("fbk_origin", "This must not be stored."),
      ),
    });

    expect(response.status).toBe(400);
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("feedbackItems")
          .withIndex("by_customerId", (q) => q)
          .take(10),
      ),
    ).resolves.toHaveLength(0);
  });

  it("limits rapid submissions for one Client Key", async () => {
    const t = createTestConvex();

    await t.run(async (ctx) => {
      const customerId = await ctx.db.insert("customers", {
        name: "Rate Limited Customer",
        slug: "rate-limited-customer",
      });
      await ctx.db.insert("customerApps", {
        customerId,
        name: "Rate Limited App",
        clientKey: "fbk_rate_limited",
        allowedOrigins: ["https://customer.example"],
      });
    });

    for (const [index, content] of [
      "First submission.",
      "Second submission.",
      "Third submission.",
    ].entries()) {
      const response = await t.fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://customer.example",
        },
        body: JSON.stringify(
          createSubmission("fbk_rate_limited", `${content} ${index}`),
        ),
      });

      expect(response.status).toBe(201);
    }

    const limitedResponse = await t.fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://customer.example",
      },
      body: JSON.stringify(
        createSubmission("fbk_rate_limited", "Fourth submission."),
      ),
    });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get("Retry-After")).toMatch(/^[1-9]\d*$/);
    await expect(limitedResponse.json()).resolves.toEqual({
      errors: ["Too many feedback submissions. Please try again later."],
    });

    await expect(
      t.run((ctx) =>
        ctx.db
          .query("feedbackItems")
          .withIndex("by_customerId", (q) => q)
          .take(10),
      ),
    ).resolves.toHaveLength(3);
  });

  it("rejects a Client Key when the Customer App has no allowed origins", async () => {
    const t = createTestConvex();

    await t.run(async (ctx) => {
      const customerId = await ctx.db.insert("customers", {
        name: "Unconfigured Customer",
        slug: "unconfigured-customer",
      });
      await ctx.db.insert("customerApps", {
        customerId,
        name: "Unconfigured App",
        clientKey: "fbk_unconfigured",
        allowedOrigins: [],
      });
    });

    const response = await t.fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://customer.example",
      },
      body: JSON.stringify(
        createSubmission("fbk_unconfigured", "This must not be stored."),
      ),
    });

    expect(response.status).toBe(400);
    await expect(
      t.run((ctx) =>
        ctx.db
          .query("feedbackItems")
          .withIndex("by_customerId", (q) => q)
          .take(10),
      ),
    ).resolves.toHaveLength(0);
  });
});

describe("Customer authentication", () => {
  it("provisions and scopes a Dashboard User to one Customer", async () => {
    const t = createTestConvex();
    const firstUser = t.withIdentity({
      tokenIdentifier: "clerk|first-user",
      email: "first@example.com",
      name: "First User",
    });
    const secondUser = t.withIdentity({
      tokenIdentifier: "clerk|second-user",
      email: "second@example.com",
      name: "Second User",
    });

    const firstWorkspace = await firstUser.mutation(
      api.dashboard.ensureViewerUser,
      {},
    );
    const secondWorkspace = await secondUser.mutation(
      api.dashboard.ensureViewerUser,
      {},
    );
    const firstApp = await firstUser.mutation(
      api.customerApps.createCustomerApp,
      { name: "First Customer App" },
    );
    const secondApps = await secondUser.query(api.customerApps.list, {});

    expect(firstWorkspace.customerId).not.toBe(secondWorkspace.customerId);
    expect(firstApp?.customerId).toBe(firstWorkspace.customerId);
    expect(secondApps).toHaveLength(0);
  });
});
