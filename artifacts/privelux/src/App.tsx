import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import { AdminAuthProvider } from "@/lib/admin-auth";
import { ScrollToTop } from "@/components/scroll-to-top";

// Route-based code splitting — heavy pages load only when visited
const Home           = lazy(() => import("@/pages/home").then((m) => ({ default: m.Home })));
const Shop           = lazy(() => import("@/pages/shop").then((m) => ({ default: m.Shop })));
const CategoryPage   = lazy(() => import("@/pages/category").then((m) => ({ default: m.CategoryPage })));
const ProductPage    = lazy(() => import("@/pages/product").then((m) => ({ default: m.ProductPage })));
const CartPage       = lazy(() => import("@/pages/cart").then((m) => ({ default: m.CartPage })));
const About          = lazy(() => import("@/pages/about").then((m) => ({ default: m.About })));
const Contact        = lazy(() => import("@/pages/contact").then((m) => ({ default: m.Contact })));
const AdminLogin     = lazy(() => import("@/pages/admin").then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard").then((m) => ({ default: m.AdminDashboard })));
const NotFound       = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // data stays fresh for 1 min — fewer refetches
      gcTime:    5 * 60_000,  // keep in cache for 5 min
    },
  },
});

// Minimal loading fallback — just keeps the dark background, no flash
function PageSkeleton() {
  return <div className="min-h-screen bg-background" />;
}

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/categoria/:slug" component={CategoryPage} />
        <Route path="/product/:id" component={ProductPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ScrollToTop />
              <Router />
            </WouterRouter>
            <Toaster theme="dark" position="top-right" richColors />
          </TooltipProvider>
        </CartProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
