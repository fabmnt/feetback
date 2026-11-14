import { DashboardAuthGate } from "./dashboard-auth-gate";
import { DashboardHeader } from "./dashboard-header";
import { DashboardThemeSync } from "./theme-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-paper font-brand text-ink">
      <DashboardThemeSync />
      <DashboardAuthGate>
        <DashboardHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </DashboardAuthGate>
    </div>
  );
}
