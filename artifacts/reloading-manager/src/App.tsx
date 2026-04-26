import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Cartridges from "@/pages/Cartridges";
import Bullets from "@/pages/Bullets";
import Powders from "@/pages/Powders";
import Primers from "@/pages/Primers";
import Loads from "@/pages/Loads";
import LoadDetail from "@/pages/LoadDetail";
import BuyIn from "@/pages/BuyIn";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import Weapons from "@/pages/Weapons";
import Licenses from "@/pages/Licenses";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cartridges" component={Cartridges} />
        <Route path="/bullets" component={Bullets} />
        <Route path="/powders" component={Powders} />
        <Route path="/primers" component={Primers} />
        <Route path="/loads" component={Loads} />
        <Route path="/loads/:id" component={LoadDetail} />
        <Route path="/buy-in" component={BuyIn} />
        <Route path="/history" component={History} />
        <Route path="/weapons" component={Weapons} />
        <Route path="/licenses" component={Licenses} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Login />;
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
