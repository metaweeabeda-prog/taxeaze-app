import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { UserProvider } from "@/context/UserContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ReceiptsList from "@/pages/ReceiptsList";
import Reports from "@/pages/Reports";
import YearlyExpenses from "@/pages/YearlyExpenses";
import { AnimatePresence, motion } from "framer-motion";

function Router() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50/50 overflow-hidden">
      <Navigation />
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0" />
        <AnimatePresence mode="wait">
          <Switch location={location}>
            <Route path="/">
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col z-10"
              >
                <Dashboard />
              </motion.div>
            </Route>
            <Route path="/receipts">
              <motion.div
                key="receipts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col z-10"
              >
                <ReceiptsList />
              </motion.div>
            </Route>
            <Route path="/yearly">
              <motion.div
                key="yearly"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col z-10"
              >
                <YearlyExpenses />
              </motion.div>
            </Route>
            <Route path="/reports">
               <motion.div
                key="reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col z-10"
              >
                <Reports />
              </motion.div>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
