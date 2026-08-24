import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthEntry from "@/pages/AuthEntry";
import AppWorkspace from "@/pages/AppWorkspace";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SwanLabShell } from "./components/SwanLabShell";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={AuthEntry} />
      <Route path={"/signup"} component={AuthEntry} />
      <Route path={"/onboarding"} component={AuthEntry} />
      <Route path={"/app/:rest*"}><SwanLabShell><AppWorkspace /></SwanLabShell></Route>
      <Route path={"/app"}><SwanLabShell><AppWorkspace /></SwanLabShell></Route>
      <Route path={"/docs"}><SwanLabShell><AppWorkspace /></SwanLabShell></Route>
      <Route path={"/status"}><SwanLabShell><AppWorkspace /></SwanLabShell></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <WorkspaceProvider><Router /></WorkspaceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
