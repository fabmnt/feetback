import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Feetback</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Collect detailed, categorized feedback from your users with a single
        script tag.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link className={buttonVariants({ size: "lg" })} href="/dashboard">
          Open dashboard
        </Link>
        <Link
          className={buttonVariants({ variant: "outline", size: "lg" })}
          href="/demo/customer-app"
        >
          Try the demo app
        </Link>
      </div>
    </main>
  );
}
