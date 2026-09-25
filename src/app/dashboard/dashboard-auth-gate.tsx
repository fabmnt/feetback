"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function DashboardAuthGate({ children }: { children: ReactNode }) {
  if (!clerkEnabled) {
    return children;
  }

  return <AuthenticatedDashboard>{children}</AuthenticatedDashboard>;
}

function AuthenticatedDashboard({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const currentUser = useQuery(api.dashboard.currentUser);
  const ensureViewerUser = useMutation(api.dashboard.ensureViewerUser);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningError, setProvisioningError] = useState("");

  if (!isLoaded || (isSignedIn && currentUser === undefined)) {
    return <AuthMessage>Loading Customer session...</AuthMessage>;
  }

  if (!isSignedIn) {
    return (
      <AuthMessage
        action={
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        }
      >
        Sign in to open your Feetback Dashboard.
      </AuthMessage>
    );
  }

  if (currentUser) {
    return children;
  }

  const createWorkspace = async () => {
    setIsProvisioning(true);
    setProvisioningError("");

    try {
      await ensureViewerUser({});
    } catch {
      setProvisioningError("The Customer workspace could not be created.");
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <AuthMessage
      action={
        <Button
          disabled={isProvisioning}
          onClick={() => void createWorkspace()}
        >
          {isProvisioning ? "Creating..." : "Create workspace"}
        </Button>
      }
    >
      {provisioningError ||
        "Create a Customer workspace before opening the Dashboard."}
    </AuthMessage>
  );
}

function AuthMessage({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-svh place-items-center px-6">
      <section className="grid max-w-md gap-4 text-center">
        <p className="text-muted-foreground text-sm">{children}</p>
        {action}
      </section>
    </main>
  );
}
