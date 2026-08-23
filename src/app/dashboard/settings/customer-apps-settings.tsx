"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

const FALLBACK_EMBED_ORIGIN = "https://your-feetback-domain";

export function CustomerAppsSettings() {
  const ensureDemoData = useMutation(api.feedback.ensureDemoData);
  const apps = useQuery(api.customerApps.list);
  const [embedOrigin, setEmbedOrigin] = useState("");

  useEffect(() => {
    setEmbedOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (apps === undefined || apps.length > 0) {
      return;
    }

    void ensureDemoData({}).catch((error) => {
      console.error("Failed to initialize demo data", error);
    });
  }, [apps, ensureDemoData]);

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-2 px-4 py-3 md:px-6">
          <SidebarTrigger />
          <h1 className="truncate font-semibold text-xl">Customer Apps</h1>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-5 md:px-6">
        <CreateCustomerAppForm />
        {apps === undefined ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <section className="divide-y">
            {apps.map((app) => (
              <CustomerAppSettings
                app={app}
                embedOrigin={embedOrigin || FALLBACK_EMBED_ORIGIN}
                key={app._id}
              />
            ))}
          </section>
        )}
      </div>
    </>
  );
}

function CreateCustomerAppForm() {
  const createCustomerApp = useMutation(api.customerApps.createCustomerApp);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Customer App name is required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await createCustomerApp({ name: trimmed });
      setName("");
    } catch (caughtError) {
      setError(
        readMutationError(caughtError, "Customer App could not be created."),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold text-lg">New Customer App</h2>
      <p className="max-w-xl text-muted-foreground text-sm">
        Each app gets its own Client Key, Allowed Origins, and embed snippet for
        the Feetback script.
      </p>
      <div className="flex max-w-lg flex-col gap-2 sm:flex-row">
        <Input
          placeholder="App name, e.g. Acme Console"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button disabled={creating} onClick={() => void create()}>
          <Plus data-icon="inline-start" />
          {creating ? "Creating..." : "Create app"}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </section>
  );
}

function CustomerAppSettings({
  app,
  embedOrigin,
}: {
  app: Doc<"customerApps">;
  embedOrigin: string;
}) {
  const updateCustomerApp = useMutation(api.customerApps.updateCustomerApp);
  const [name, setName] = useState(app.name);
  const [origins, setOrigins] = useState(app.allowedOrigins.join("\n"));
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const save = async () => {
    setStatus({ kind: "idle" });

    try {
      const updated = await updateCustomerApp({
        customerAppId: app._id,
        name,
        allowedOrigins: origins.split("\n"),
      });

      if (updated) {
        setName(updated.name);
        setOrigins(updated.allowedOrigins.join("\n"));
      }

      setStatus({ kind: "saved" });
    } catch (caughtError) {
      setStatus({
        kind: "error",
        message: readMutationError(
          caughtError,
          "Customer App could not be saved.",
        ),
      });
    }
  };

  const snippet = buildEmbedSnippet(app.clientKey, embedOrigin);

  return (
    <section className="grid gap-6 py-6 first:pt-0 lg:grid-cols-2">
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">Client Key</p>
            <code className="font-mono text-sm">{app.clientKey}</code>
          </div>
          <CopyButton value={app.clientKey}>Copy key</CopyButton>
        </div>
        <label className="grid gap-1 text-sm" htmlFor={`app-name-${app._id}`}>
          <span className="text-muted-foreground">App name</span>
          <Input
            id={`app-name-${app._id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label
          className="grid gap-1 text-sm"
          htmlFor={`app-origins-${app._id}`}
        >
          <span className="text-muted-foreground">
            Allowed Origins (one per line; leave empty to allow any origin)
          </span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 py-1 font-mono text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            id={`app-origins-${app._id}`}
            placeholder={"https://app.example.com\nhttps://staging.example.com"}
            value={origins}
            onChange={(event) => setOrigins(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={() => void save()}>Save changes</Button>
          {status.kind === "saved" ? (
            <span className="text-muted-foreground text-sm">Saved</span>
          ) : null}
          {status.kind === "error" ? (
            <span className="text-destructive text-sm">{status.message}</span>
          ) : null}
        </div>
      </div>
      <div className="grid content-start gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">Embed snippet</p>
          <CopyButton value={snippet}>Copy snippet</CopyButton>
        </div>
        <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
          {snippet}
        </pre>
      </div>
    </section>
  );
}

function buildEmbedSnippet(clientKey: string, embedOrigin: string) {
  return `<script>
  window.FeetbackSettings = {
    clientKey: "${clientKey}",
    apiUrl: "${embedOrigin}/api/feedback"
  };
</script>
<script src="${embedOrigin}/feetback.js" async></script>`;
}

function readMutationError(error: unknown, fallback: string) {
  return error instanceof ConvexError
    ? String(error.data ?? fallback)
    : fallback;
}
