"use client";

import {
  ChartNoAxesColumnIncreasing,
  CircleDot,
  ClipboardList,
  Code2,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const workspaceLinks = [
  { label: "Issues", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inbox", href: "#", icon: Inbox },
  { label: "Roadmap", href: "#", icon: Workflow },
  { label: "Announcements", href: "#", icon: Megaphone },
  { label: "Customers", href: "#", icon: Users },
  { label: "Install Script", href: "/dashboard/settings", icon: Code2 },
] as const;
const adminLinks = [
  { label: "Moderation", href: "#", icon: ShieldCheck },
  { label: "Reports", href: "#", icon: ClipboardList },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Feetback" isActive>
              <ChartNoAxesColumnIncreasing />
              <span>Feetback</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceLinks.map((item) => (
                <SidebarLink key={item.label} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminLinks.map((item) => (
                <SidebarLink key={item.label} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Demo workspace">
              <CircleDot />
              <span>Demo workspace</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarLink({
  item,
  pathname,
}: {
  item: {
    label: string;
    href: string;
    icon: React.ComponentType;
  };
  pathname: string;
}) {
  const Icon = item.icon;
  const active = item.href !== "#" && pathname === item.href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={active}
        tooltip={item.label}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
