import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardAuthGate } from "./dashboard-auth-gate";
import { DashboardSidebar } from "./dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGate>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset className="min-h-svh">{children}</SidebarInset>
      </SidebarProvider>
    </DashboardAuthGate>
  );
}
