import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, Users, Calendar, LogIn, User, LogOut, LayoutDashboard, Play, Bell, Settings, BookOpen, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useClubOwnership } from "@/hooks/useClubOwnership";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logoImage from "@/assets/unicircle-logo-new.png";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const Header = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotifications();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isClubOwner = ownedClubs.length > 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/discover", label: "Discover", icon: Zap },
    { href: "/clubs", label: "Clubs", icon: Users },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/demo", label: "Demo", icon: Play },
    { href: "/story", label: "Our Story", icon: BookOpen },
  ];

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/60 backdrop-blur-xl border-b border-border/50 py-2 shadow-sm" 
          : "bg-transparent backdrop-blur-sm py-4"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 md:px-6 h-14 md:h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ scale: 1.02 }}
          >
            <img 
              src={logoImage} 
              alt="UniCircle" 
              className="h-10 md:h-14 w-auto object-contain"
            />
          </motion.div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link 
                to={link.href} 
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 relative group tracking-[0.1em] uppercase"
              >
                <link.icon className="w-3.5 h-3.5 inline-block mr-1.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                {link.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gold group-hover:w-full transition-all duration-200" />
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Auth Section */}
        <div className="hidden md:flex items-center gap-2">
          {authLoading || ownershipLoading ? (
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              {/* Notification Bell */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-80 p-0 border border-white/10 rounded-2xl overflow-hidden"
                  style={{ background: '#111' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="text-sm font-semibold text-foreground">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => user?.id && markAllRead(user.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                        <Bell className="w-6 h-6 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-white/5 last:border-b-0 ${n.read ? 'opacity-60' : 'bg-white/[0.03]'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium leading-snug ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {n.title}
                            </p>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                              {formatRelativeTime(n.created_at)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Admin portal switcher — visible for club owners */}
              {isClubOwner && (
                <Link
                  to="/club-admin"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold/30 bg-gold/8 text-gold text-xs font-semibold hover:bg-gold/15 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  Admin Portal
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10 border-2 border-gold/30">
                      <AvatarFallback className="bg-gold/10 text-gold font-bold text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  {isClubOwner && (
                    <p className="text-xs text-gold font-semibold">Club Owner</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Student Dashboard
                  </Link>
                </DropdownMenuItem>
                {isClubOwner && (
                  <DropdownMenuItem asChild>
                    <Link to="/club-admin" className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Club Admin Portal
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to={isClubOwner ? "/club-admin/profile" : "/profile"} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="gold" size="default" className="relative group overflow-hidden" asChild>
                <Link to="/login">
                  <span className="relative z-10 flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Login
                  </span>
                </Link>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Mobile menu button */}
        <motion.button
          className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait">
            {isMobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-5 h-5 text-foreground" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu className="w-5 h-5 text-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden"
          >
            <div className="bg-card/95 backdrop-blur-xl border-b border-border px-4 py-6 mt-2">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Link
                      to={link.href}
                      className="block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-3 px-4 rounded-lg hover:bg-gold/5 tracking-[0.1em] uppercase"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <link.icon className="w-4 h-4 inline-block mr-2 opacity-70" />
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                
                {user ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.24 }}
                    >
                      <Link
                        to="/dashboard"
                        className="block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-3 px-4 rounded-lg hover:bg-gold/5 tracking-[0.1em] uppercase"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="w-4 h-4 inline-block mr-2 opacity-70" />
                        Student Portal
                      </Link>
                      {isClubOwner && (
                        <Link
                          to="/club-admin"
                          className="block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-3 px-4 rounded-lg hover:bg-gold/5 tracking-[0.1em] uppercase"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4 inline-block mr-2 opacity-70" />
                          Club Admin Portal
                        </Link>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.32 }}
                    >
                      <Link
                        to={isClubOwner ? "/club-admin/profile" : "/profile"}
                        className="block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-3 px-4 rounded-lg hover:bg-gold/5 tracking-[0.1em] uppercase"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4 inline-block mr-2 opacity-70" />
                        Profile Settings
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4"
                    >
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 }}
                    className="mt-4"
                  >
                    <Button variant="gold" size="lg" className="w-full" asChild>
                      <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <LogIn className="w-4 h-4 mr-2" />
                        Login
                      </Link>
                    </Button>
                  </motion.div>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
