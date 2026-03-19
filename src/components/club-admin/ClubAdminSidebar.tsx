import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Plus, LogOut, ArrowLeft, Settings, User, Users, BarChart2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const { profile } = useAdminProfile();
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
        {/* Admin Profile Header */}
        {profile && (
          <div className={cn(
            "p-3 border-b border-border",
            collapsed ? "flex justify-center" : ""
          )}>
            <Link 
              to="/club-admin/profile"
              className={cn(
                "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted",
                location.pathname === '/club-admin/profile' && "bg-gold/10"
              )}
            >
              <Avatar className="w-9 h-9 border border-gold/30">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-gold/10 text-gold text-sm">
                  {profile.display_name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.role_title}
                  </p>
                </div>
              )}
            </Link>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
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
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              My Clubs
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ownedClubs.map((club) => (
                  <div key={club.clubId} className="space-y-1">
                    <div className={cn(
                      "px-3 py-1.5 text-xs font-medium text-muted-foreground truncate",
                      collapsed && "hidden"
                    )}>
                      {club.clubName}
                    </div>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          to={`/club-admin/clubs/${club.clubId}/recruitment`}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md transition-colors font-medium',
                            location.pathname === `/club-admin/clubs/${club.clubId}/recruitment`
                              ? 'bg-gold/20 text-gold border border-gold/30'
                              : 'hover:bg-gold/10 text-foreground'
                          )}
                        >
                          <Users className="w-4 h-4" />
                          {!collapsed && <span>Recruitment</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          to={`/club-admin/clubs/${club.clubId}/events`}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                            location.pathname === `/club-admin/clubs/${club.clubId}/events`
                              ? 'bg-gold/10 text-gold'
                              : 'hover:bg-muted'
                          )}
                        >
                          <Calendar className="w-4 h-4" />
                          {!collapsed && <span>Events</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          to={`/club-admin/clubs/${club.clubId}/analytics`}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                            location.pathname === `/club-admin/clubs/${club.clubId}/analytics`
                              ? 'bg-gold/10 text-gold'
                              : 'hover:bg-muted'
                          )}
                        >
                          <BarChart2 className="w-4 h-4" />
                          {!collapsed && <span>Analytics</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          to={`/club-admin/clubs/${club.clubId}/edit`}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm',
                            location.pathname === `/club-admin/clubs/${club.clubId}/edit`
                              ? 'bg-gold/10 text-gold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Settings className="w-3.5 h-3.5" />
                          {!collapsed && <span>Edit Profile</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </div>
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
