import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Plus, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ClubAdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { ownedClubs } = useClubOwnership();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;
  const isClubActive = (clubId: string) => location.pathname.includes(clubId);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/club-admin"
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                      isActive('/club-admin')
                        ? 'bg-gold/10 text-gold'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Home className="w-4 h-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/submit-event"
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                      isActive('/submit-event')
                        ? 'bg-gold/10 text-gold'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    {!collapsed && <span>Submit Event</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && ownedClubs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              My Clubs
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ownedClubs.map((club) => (
                  <SidebarMenuItem key={club.clubId}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={`/club-admin/clubs/${club.clubId}/events`}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                          isClubActive(club.clubId)
                            ? 'bg-gold/10 text-gold'
                            : 'hover:bg-muted'
                        )}
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="truncate">{club.clubName}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                {!collapsed && <span>Back to Site</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                className="w-full justify-start px-3 py-2 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                {!collapsed && <span className="ml-2">Sign Out</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
