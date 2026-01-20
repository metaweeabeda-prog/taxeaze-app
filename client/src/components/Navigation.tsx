import { Link, useLocation } from "wouter";
import { LayoutDashboard, Receipt, FileBarChart, PlusCircle, Users, DollarSign, Table } from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "./ThemeToggle";

export function Navigation() {
  const [location] = useLocation();
  const { userId: currentUser, setUserId: setCurrentUser } = useUser();
  const queryClient = useQueryClient();

  const handleUserSwitch = (newUser: string) => {
    setCurrentUser(newUser);
    queryClient.invalidateQueries();
  };

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/receipts", label: "Receipts", icon: Receipt },
    { href: "/yearly", label: "Yearly Table", icon: Table },
    { href: "/reports", label: "Tax Reports", icon: FileBarChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border md:static md:w-64 md:h-screen md:border-r md:border-t-0 md:bg-card md:flex-shrink-0">
      <div className="flex flex-col h-full p-2 md:p-6 justify-between md:justify-start gap-1 md:gap-4">
        
        {/* Logo Area */}
        <div className="hidden md:flex items-center justify-between px-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-foreground">TaXEaze</span>
          </div>
          <ThemeToggle />
        </div>

        {/* User Switcher */}
        <div className="px-4 mb-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 px-1">Active Profile</p>
          <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl border border-border/50">
            <button 
              onClick={() => handleUserSwitch('user1')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${currentUser === 'user1' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Person 1
            </button>
            <button 
              onClick={() => handleUserSwitch('user2')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${currentUser === 'user2' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Person 2
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-row md:flex-col w-full justify-around md:justify-start gap-1 md:gap-2">
          {links.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;
            
            return (
              <Link key={link.href} href={link.href} className={`
                relative flex flex-col md:flex-row items-center md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200 group
                ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
              `}>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl md:rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={`w-6 h-6 md:w-5 md:h-5 z-10 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="text-[10px] md:text-sm z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile FAB replacement for Desktop Add Button if needed, or just info */}
        <div className="hidden md:block mt-auto">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/20">
            <h4 className="font-display font-semibold mb-1">Tax Season?</h4>
            <p className="text-xs text-muted-foreground mb-3">Export your data in one click for your accountant.</p>
            <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-3/4 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
