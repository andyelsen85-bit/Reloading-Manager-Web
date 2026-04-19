import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Cartridges from "@/pages/Cartridges";
import Bullets from "@/pages/Bullets";
import Powders from "@/pages/Powders";
import Primers from "@/pages/Primers";
import Loads from "@/pages/Loads";
import LoadDetail from "@/pages/LoadDetail";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
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
        <Route path="/history" component={History} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
