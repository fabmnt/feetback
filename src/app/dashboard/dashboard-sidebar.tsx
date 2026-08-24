"use client";

import {
  ChartNoAxesColumnIncreasing,
  LayoutDashboard,
  PanelLeftIcon,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navLinks = [
  { label: "Issues", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customer Apps", href: "/dashboard/settings", icon: Settings },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-1">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              {/* Collapses the sidebar when clicked; doubles as the trigger while collapsed */}
              <SidebarMenuButton
                size="lg"
                onClick={toggleSidebar}
                className="group-data-[collapsible=icon]:justify-center"
              >
                <CollapsedAwareLogoIcon />
                <span className="group-data-[collapsible=icon]:hidden">
                  Feetback
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navLinks.map((item) => (
                <SidebarLink key={item.label} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function CollapsedAwareLogoIcon() {
  return (
    <span className="relative grid size-4 place-items-center [&_svg]:size-4">
      <ChartNoAxesColumnIncreasing className="transition-opacity group-data-[collapsible=icon]:group-hover/menu-button:opacity-0" />
      {/* While collapsed, hovering the logo reveals the collapse trigger */}
      <PanelLeftIcon className="absolute inset-0 m-auto opacity-0 transition-opacity group-data-[collapsible=icon]:group-hover/menu-button:opacity-100" />
    </span>
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
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

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
