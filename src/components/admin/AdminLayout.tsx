import { ReactNode } from "react";
import { useNavigate, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Users, Activity, BarChart3, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { title: "User Management", url: "/admin-dashboard/users", icon: Users },
  { title: "Stress Analytics", url: "/admin-dashboard/stress", icon: Activity },
  { title: "Workout Statistics", url: "/admin-dashboard/workouts", icon: BarChart3 },
  { title: "Settings", url: "/admin-dashboard/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutAdmin();
    navigate("/admin/login", { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold text-foreground">Admin</span>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={active}>
                          <RouterNavLink to={item.url}>
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                          </RouterNavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-display font-semibold text-foreground">SportHub Admin</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
