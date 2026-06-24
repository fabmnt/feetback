import { DashboardTheme } from "./dashboard-theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardTheme>{children}</DashboardTheme>;
}
