import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { SIZE_TEMPLATES, TEMPLATE_LABELS } from "@/lib/size-templates";
import { formatPrice, cloudinaryImage } from "@/lib/format";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  useGetAdminMe,
  getGetAdminMeQueryKey,
  useListProducts,
  useGetShopSummary,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListCategories,
  useListBrands,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  useDuplicateProduct,
  useListAllFeaturedBrands,
  useCreateFeaturedBrand,
  useUpdateFeaturedBrand,
  useDeleteFeaturedBrand,
  useListPurchaseRequests,
  useUpdatePurchaseRequest,
  useDeletePurchaseRequest,
  useResetPurchaseRequestSequence,
  useGetPurchaseRequestStats,
  Product,
  Category,
  Brand,
  FeaturedBrand,
  PurchaseRequest,
} from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  Plus,
  Edit,
  Trash2,
  LayoutDashboard,
  Package,
  Tag,
  Bookmark,
  Eye,
  EyeOff,
  Search,
  Star,
  X,
  Image as ImageIcon,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  Upload,
  ExternalLink,
  LayoutGrid,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileJson,
  Copy,
  ShoppingBag,
  Phone,
  Share2,
  GripVertical,
  Cloud,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";

type Section = "overview" | "products" | "categories" | "brands" | "featured-brands" | "orders" | "stats";

const FADE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2 },
};

const PRODUCT_PLACEHOLDER_IMAGE = "/product-placeholder.svg";

/* ── Shared: defined at module level to avoid re-mount on every render ── */
const inputCls =
  "rounded-none border-white/10 bg-[#0a0a0a] h-9 text-xs focus-visible:ring-primary";

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

function getCloudinaryCloudName(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com") return null;
    return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

function getCloudinaryDownloadUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com") return url;

    const uploadMarker = "/image/upload/";
    if (!parsed.pathname.includes(uploadMarker)) return url;
    if (parsed.pathname.includes("/fl_attachment/")) return url;

    parsed.pathname = parsed.pathname.replace(
      uploadMarker,
      `${uploadMarker}fl_attachment/`,
    );
    return parsed.toString();
  } catch {
    return url;
  }
}

function downloadProductImage(url: string) {
  const downloadUrl = getCloudinaryDownloadUrl(url);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.download = "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function SortableProductImageCard({
  id,
  url,
  index,
  onRemove,
}: {
  id: string;
  url: string;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const cloudName = getCloudinaryCloudName(url);

  const showCloudinaryOrigin = () => {
    if (cloudName) {
      toast.success(`Cloudinary: ${cloudName}`);
      return;
    }

    toast.error("No se pudo identificar la cuenta de Cloudinary de esta imagen");
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 20 : undefined,
      }}
      className="relative group bg-[#0a0a0a] border border-white/10 overflow-hidden select-none"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        <img
          src={cloudinaryImage(url)}
          alt={`Imagen ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none"
        />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/75 to-transparent">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para cambiar el orden"
          className="h-7 w-7 flex items-center justify-center bg-black/55 border border-white/15 text-white/80 cursor-grab active:cursor-grabbing touch-none hover:bg-black/75 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Eliminar imagen"
          className="h-7 w-7 flex items-center justify-center bg-black/55 border border-white/15 text-white/80 hover:text-red-400 hover:bg-black/75 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/90 via-black/65 to-transparent flex items-end justify-between gap-2">
        <span
          className={`text-[9px] uppercase tracking-widest ${
            index === 0 ? "text-primary" : "text-white/65"
          }`}
        >
          {index === 0 ? "Principal" : `Imagen ${index + 1}`}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            aria-label="Abrir imagen original en Cloudinary"
            title="Abrir imagen original"
            className="h-6 w-6 flex items-center justify-center bg-black/60 border border-white/15 text-white/75 hover:text-white hover:bg-black/80 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => downloadProductImage(url)}
            aria-label="Descargar imagen original"
            title="Descargar imagen"
            className="h-6 w-6 flex items-center justify-center bg-black/60 border border-white/15 text-white/75 hover:text-primary hover:bg-black/80 transition-colors"
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={showCloudinaryOrigin}
            aria-label={
              cloudName
                ? `Ver cuenta de Cloudinary: ${cloudName}`
                : "Ver cuenta de Cloudinary"
            }
            title={cloudName ? `Cloudinary: ${cloudName}` : "Ver cuenta de Cloudinary"}
            className="h-6 w-6 flex items-center justify-center bg-black/60 border border-white/15 text-white/75 hover:text-sky-300 hover:bg-black/80 transition-colors"
          >
            <Cloud className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <Input
            required={required}
            placeholder="https://res.cloudinary.com/…/image.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
          {hint && (
            <p className="text-[10px] text-muted-foreground/50 mt-1 leading-relaxed">{hint}</p>
          )}
        </div>
        {value ? (
          <div className="w-10 h-10 shrink-0 bg-muted border border-white/10 overflow-hidden">
            <img
              src={cloudinaryImage(value)}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0";
              }}
            />
          </div>
        ) : (
          <div className="w-10 h-10 shrink-0 bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/30" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Slug generator ── */
function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function AdminDashboard() {
  const { token, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    data: adminInfo,
    isLoading: adminLoading,
    error: adminError,
  } = useGetAdminMe({
    query: {
      enabled: !!token,
      queryKey: getGetAdminMeQueryKey(),
      retry: false,
    },
    request: { headers: { Authorization: `Bearer ${token}` } },
  });

  useEffect(() => {
    if (!token || adminError) {
      logout();
      setLocation("/admin");
    }
  }, [token, adminError, logout, setLocation]);

  const { data: summary } = useGetShopSummary();
  const { data: categories } = useListCategories();
  const { data: brands } = useListBrands();

  const authHeaders = { Authorization: `Bearer ${token}` };

  const { data: allRequests } = useListPurchaseRequests({
    request: { headers: { Authorization: `Bearer ${token}` } },
  });
  const nuevasCount = allRequests ? allRequests.filter((r) => r.status === "nueva").length : 0;
  const invalidate = useCallback(
    (key: string) => queryClient.invalidateQueries({ queryKey: [key] }),
    [queryClient],
  );

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary font-serif uppercase tracking-widest text-sm">
        Cargando...
      </div>
    );
  }
  if (!adminInfo) return null;

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "products",
      label: "Productos",
      icon: <Package className="h-4 w-4" />,
    },
    {
      id: "categories",
      label: "Categorías",
      icon: <Tag className="h-4 w-4" />,
    },
    { id: "brands", label: "Marcas", icon: <Bookmark className="h-4 w-4" /> },
    { id: "featured-brands", label: "Marcas Home", icon: <Star className="h-4 w-4" /> },
    { id: "orders", label: "Solicitudes", icon: <ShoppingBag className="h-4 w-4" /> },
    { id: "stats", label: "Estadísticas", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const navigate = (s: Section) => {
    setSection(s);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex text-sm">
      {/* Sidebar overlay on mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#111] border-r border-white/5 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/5">
          <span className="font-serif text-base tracking-widest font-bold">
            PRIVELUX
          </span>
          <button
            className="md:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
            Panel Admin
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs uppercase tracking-widest font-medium transition-colors ${
                section === item.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {item.icon}
              {item.label}
              {item.id === "orders" && nuevasCount > 0 && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
                  </span>
                  <span className="text-[10px] font-bold text-yellow-400">{nuevasCount}</span>
                </span>
              )}
              {section === item.id && item.id !== "orders" && (
                <ChevronRight className="h-3 w-3 ml-auto" />
              )}
              {section === item.id && item.id === "orders" && nuevasCount === 0 && (
                <ChevronRight className="h-3 w-3 ml-auto" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground">Sesión activa</p>
              <p className="text-xs font-medium mt-0.5">{adminInfo.username}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => {
                logout();
                setLocation("/admin");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-14 bg-[#111] border-b border-white/5 flex items-center px-5 gap-4 shrink-0">
          <button
            className="md:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Layers className="h-5 w-5" />
          </button>
          <h1 className="font-serif uppercase tracking-widest text-sm">
            {navItems.find((n) => n.id === section)?.label}
          </h1>
        </header>

        <main className="flex-1 overflow-auto p-5 md:p-8 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            {section === "overview" && (
              <motion.div key="overview" {...FADE}>
                <OverviewSection
                  summary={summary}
                  categories={categories}
                  onNavigate={navigate}
                />
              </motion.div>
            )}
            {section === "products" && (
              <motion.div key="products" {...FADE}>
                <ProductsSection
                  token={token!}
                  authHeaders={authHeaders}
                  categories={categories}
                  brands={brands}
                  invalidate={invalidate}
                />
              </motion.div>
            )}
            {section === "categories" && (
              <motion.div key="categories" {...FADE}>
                <CategoriesSection
                  token={token!}
                  authHeaders={authHeaders}
                  invalidate={invalidate}
                />
              </motion.div>
            )}
            {section === "brands" && (
              <motion.div key="brands" {...FADE}>
                <BrandsSection
                  token={token!}
                  authHeaders={authHeaders}
                  invalidate={invalidate}
                />
              </motion.div>
            )}
            {section === "featured-brands" && (
              <motion.div key="featured-brands" {...FADE}>
                <FeaturedBrandsSection
                  token={token!}
                  authHeaders={authHeaders}
                  invalidate={invalidate}
                />
              </motion.div>
            )}
            {section === "orders" && (
              <motion.div key="orders" {...FADE}>
                <RequestsSection
                  authHeaders={authHeaders}
                  invalidate={invalidate}
                />
              </motion.div>
            )}
            {section === "stats" && (
              <motion.div key="stats" {...FADE}>
                <StatsSection authHeaders={authHeaders} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#111] border-t border-white/5 flex safe-pb">
        {([
          { id: "overview" as Section, label: "Inicio", icon: <LayoutDashboard className="h-5 w-5" /> },
          { id: "orders" as Section,   label: "Pedidos", icon: <ShoppingBag className="h-5 w-5" /> },
          { id: "products" as Section, label: "Productos", icon: <Package className="h-5 w-5" /> },
          { id: "stats" as Section,    label: "Stats",    icon: <TrendingUp className="h-5 w-5" /> },
        ] as { id: Section; label: string; icon: React.ReactNode }[]).map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[9px] uppercase tracking-wider transition-colors ${
              section === item.id ? "text-primary" : "text-muted-foreground/70"
            }`}
          >
            {item.id === "orders" && nuevasCount > 0 && (
              <span className="absolute top-2 left-1/2 ml-2 min-w-[16px] h-4 px-1 rounded-full bg-yellow-400 text-[9px] text-black font-bold flex items-center justify-center">
                {nuevasCount}
              </span>
            )}
            <span className={section === item.id ? "text-primary" : ""}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        {/* "Más" opens sidebar for categories/brands/etc */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[9px] uppercase tracking-wider text-muted-foreground/70"
        >
          <Layers className="h-5 w-5" />
          Más
        </button>
      </nav>
    </div>
  );
}

/* ══════════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════════ */
function OverviewSection({
  summary,
  categories,
  onNavigate,
}: {
  summary: any;
  categories: Category[] | undefined;
  onNavigate: (s: Section) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Productos",
            value: summary?.totalProducts ?? "—",
            icon: <Package className="h-4 w-4" />,
            section: "products" as Section,
          },
          {
            label: "Categorías",
            value: summary?.totalCategories ?? "—",
            icon: <Tag className="h-4 w-4" />,
            section: "categories" as Section,
          },
          {
            label: "Marcas",
            value: "—",
            icon: <Bookmark className="h-4 w-4" />,
            section: "brands" as Section,
          },
          {
            label: "Destacados",
            value: summary?.categoryCounts?.length ?? "—",
            icon: <Star className="h-4 w-4" />,
            section: "products" as Section,
          },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.section)}
            className="bg-[#111] border border-white/5 p-5 text-left hover:border-primary/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground group-hover:text-primary transition-colors">
                {card.icon}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-2xl font-serif mb-1">{card.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {card.label}
            </p>
          </button>
        ))}
      </div>

      {summary?.categoryCounts && summary.categoryCounts.length > 0 && (
        <div className="bg-[#111] border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-xs uppercase tracking-widest font-medium">
              Productos por categoría
            </h2>
          </div>
          <div className="space-y-3">
            {summary.categoryCounts.map(
              (c: { categoryName: string; count: number }) => {
                const pct =
                  summary.totalProducts > 0
                    ? Math.round((c.count / summary.totalProducts) * 100)
                    : 0;
                return (
                  <div key={c.categoryName}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground uppercase tracking-wider">
                        {c.categoryName}
                      </span>
                      <span className="text-foreground">{c.count}</span>
                    </div>
                    <div className="h-px bg-white/5 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Quick tip */}
      <div className="bg-primary/5 border border-primary/20 p-5 flex gap-3">
        <Upload className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-primary mb-1 uppercase tracking-widest">
            Workflow de imágenes
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sube tus imágenes a{" "}
            <a
              href="https://cloudinary.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Cloudinary
            </a>{" "}
            (gratuito) y copia la URL directa. Pega esa URL en cualquier campo
            de imagen del dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════ */
function ProductsSection({
  authHeaders,
  categories,
  brands,
  invalidate,
}: {
  token: string;
  authHeaders: Record<string, string>;
  categories: Category[] | undefined;
  brands: Brand[] | undefined;
  invalidate: (k: string) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [autoEditProduct, setAutoEditProduct] = useState<Product | null>(null);

  const { data: products } = useListProducts(
    {
      search: search || undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
    },
    { request: { headers: authHeaders } },
  );

  const createProduct = useCreateProduct({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Producto creado");
        invalidate("/api/products");
      },
      onError: () => toast.error("Error al crear producto"),
    },
  });

  const updateProduct = useUpdateProduct({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Producto actualizado");
        invalidate("/api/products");
      },
      onError: () => toast.error("Error al actualizar"),
    },
  });

  const deleteProduct = useDeleteProduct({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Producto eliminado");
        invalidate("/api/products");
      },
      onError: () => toast.error("Error al eliminar"),
    },
  });

  const duplicateProduct = useDuplicateProduct({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: (data) => {
        qc.removeQueries({ queryKey: ["/api/products"] });
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        setAutoEditProduct(data);
      },
      onError: () => toast.error("Error al duplicar — revisa la consola"),
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#111] border-white/10 rounded-none h-9 text-xs"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-[#111] border border-white/10 text-foreground rounded-none uppercase tracking-wider focus:outline-none focus:border-primary/60"
          >
            <option value="all">Todas las categorías</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <ImportJsonDialog
            categories={categories}
            brands={brands}
            authHeaders={authHeaders}
            invalidate={invalidate}
          >
            <Button variant="outline" className="rounded-none uppercase tracking-widest text-xs h-9 whitespace-nowrap border-white/10 bg-transparent hover:bg-white/5">
              <Upload className="h-3.5 w-3.5 mr-2" /> Importar JSON
            </Button>
          </ImportJsonDialog>
          <Button
            variant="outline"
            className="rounded-none uppercase tracking-widest text-xs h-9 whitespace-nowrap border-white/10 bg-transparent hover:bg-white/5"
            onClick={() => exportProductsJson(authHeaders)}
          >
            <Download className="h-3.5 w-3.5 mr-2" /> Exportar JSON
          </Button>
          <ProductDialog
            mode="create"
            categories={categories}
            brands={brands}
            onSubmit={(data) => createProduct.mutate({ data })}
          >
            <Button className="rounded-none uppercase tracking-widest text-xs h-9 whitespace-nowrap">
              <Plus className="h-3.5 w-3.5 mr-2" /> Nuevo producto
            </Button>
          </ProductDialog>
        </div>
      </div>

      <div className="bg-[#111] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/5">
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="p-4 font-medium w-14">Img</th>
                <th className="p-4 font-medium">Nombre</th>
                <th className="p-4 font-medium hidden sm:table-cell">Precio</th>
                <th className="p-4 font-medium hidden md:table-cell">
                  Categoría
                </th>
                <th className="p-4 font-medium hidden lg:table-cell">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products?.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-white/2 transition-colors"
                >
                  <td className="p-4">
                    <div className="w-10 h-10 bg-muted overflow-hidden">
                      <img
                        src={cloudinaryImage(product.image)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-xs truncate max-w-[180px]">
                      {product.name}
                    </p>
                    <p className="text-muted-foreground text-[10px] sm:hidden mt-0.5">
                      ${formatPrice(Number(product.price))} · {product.categoryName}
                    </p>
                  </td>
                  <td className="p-4 hidden sm:table-cell text-xs">
                    ${formatPrice(Number(product.price))}
                  </td>
                  <td className="p-4 hidden md:table-cell text-xs text-muted-foreground">
                    {product.categoryName}
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={product.visible}
                          onCheckedChange={() =>
                            updateProduct.mutate({
                              id: product.id,
                              data: { visible: !product.visible },
                            })
                          }
                          className="scale-75 origin-left"
                        />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {product.visible ? (
                            <Eye className="h-3 w-3 inline mr-1" />
                          ) : (
                            <EyeOff className="h-3 w-3 inline mr-1" />
                          )}
                          {product.visible ? "Visible" : "Oculto"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={product.featured}
                          onCheckedChange={() =>
                            updateProduct.mutate({
                              id: product.id,
                              data: { featured: !product.featured },
                            })
                          }
                          className="scale-75 origin-left"
                        />
                        <span className="text-[10px] uppercase tracking-wider text-primary">
                          <Star className="h-3 w-3 inline mr-1" />
                          Destacado
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          updateProduct.mutate({
                            id: product.id,
                            data: { visible: !product.visible },
                          })
                        }
                        title={product.visible ? "Ocultar" : "Mostrar"}
                      >
                        {product.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        className="lg:hidden p-1.5 text-muted-foreground hover:text-primary"
                        onClick={() =>
                          updateProduct.mutate({
                            id: product.id,
                            data: { featured: !product.featured },
                          })
                        }
                        title="Destacado"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${product.featured ? "fill-primary text-primary" : ""}`}
                        />
                      </button>
                      <ProductDialog
                        mode="edit"
                        product={product}
                        categories={categories}
                        brands={brands}
                        onSubmit={(data) =>
                          updateProduct.mutate({ id: product.id, data })
                        }
                      >
                        <button className="p-1.5 text-muted-foreground hover:text-foreground" title="Editar">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </ProductDialog>
                      <button
                        className="p-1.5 text-muted-foreground hover:text-blue-400"
                        title="Duplicar"
                        onClick={() => duplicateProduct.mutate({ id: product.id })}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                        title="Eliminar"
                        onClick={() => {
                          if (confirm(`¿Eliminar "${product.name}"?`)) {
                            deleteProduct.mutate({ id: product.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products?.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-muted-foreground text-xs uppercase tracking-wider"
                  >
                    No hay productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-open edit dialog after duplicate */}
      {autoEditProduct && (
        <ProductDialog
          mode="edit"
          product={autoEditProduct}
          categories={categories}
          brands={brands}
          onSubmit={(data) => updateProduct.mutate({ id: autoEditProduct.id, data })}
          forceOpen={true}
          onForceClose={() => setAutoEditProduct(null)}
        >
          <span />
        </ProductDialog>
      )}
    </div>
  );
}

/* ── Export helper ── */
async function exportProductsJson(authHeaders: Record<string, string>) {
  const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";
  try {
    const res = await fetch(`${apiBase}/api/products`, { headers: authHeaders });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json() as any[];
    const formatted = products.map((p) => {
      const images = [p.image, ...(p.imageUrls ?? [])]
        .filter((url): url is string => Boolean(url) && url !== PRODUCT_PLACEHOLDER_IMAGE);

      return {
        name: p.name,
        category: p.categoryName ?? "",
        ...(p.brandName ? { brand: p.brandName } : {}),
        price: Number(p.price),
        ...(p.isOnSale ? {
          isOnSale: true,
          originalPrice: Number(p.originalPrice),
          salePrice: Number(p.salePrice),
        } : {}),
        featured: p.featured ?? false,
        visible: p.visible ?? true,
        stock: p.stock ?? 0,
        ...(p.description ? { description: p.description } : {}),
        ...(images.length > 0 ? { images } : {}),
      };
    });
    const blob = new Blob([JSON.stringify(formatted, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `privelux-productos-${new Date().toISOString().split("T")[0]}.json`;
    // Must be in the DOM for Firefox and some Chromium versions to trigger the download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${formatted.length} productos exportados`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("exportProductsJson error:", err);
    toast.error("Error al exportar productos");
  }
}

/* ── Import JSON types ── */
type ImportRow = {
  index: number;
  rawName: string;
  valid: boolean;
  errors: string[];
  payload?: {
    name: string;
    description?: string;
    price: number;
    categoryId: number;
    brandId?: number;
    image: string;
    imageUrls?: string[];
    featured?: boolean;
    visible?: boolean;
    stock?: number;
  };
};

/**
 * Normaliza texto para comparación robusta:
 * - Elimina acentos (á→a, é→e, ñ→n, etc.)
 * - Colapsa espacios múltiples en uno
 * - Elimina espacios al inicio y al final
 * - Convierte a minúsculas
 */
function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function validateImportRows(
  items: unknown[],
  categories: Category[],
  brands: Brand[],
): ImportRow[] {
  return items.map((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      return { index, rawName: `Ítem ${index + 1}`, valid: false, errors: ["No es un objeto válido"] };
    }
    const item = raw as Record<string, unknown>;
    const rawName = typeof item.name === "string" && item.name.trim() ? item.name.trim() : `Ítem ${index + 1}`;
    const errors: string[] = [];

    if (!item.name || typeof item.name !== "string" || !(item.name as string).trim()) {
      errors.push("Nombre requerido");
    }
    if (typeof item.price !== "number" || (item.price as number) <= 0) {
      errors.push("Precio inválido (número > 0)");
    }
    if (item.images !== undefined && !Array.isArray(item.images)) {
      errors.push('"images" debe ser un array de URLs');
    }

    const catInput = typeof item.category === "string" ? item.category : "";
    const cat = catInput.trim()
      ? categories.find((c) => normalizeText(c.name) === normalizeText(catInput))
      : undefined;
    if (!catInput.trim()) {
      errors.push("Categoría requerida");
    } else if (!cat) {
      const available = categories.map((c) => c.name.trim()).join(", ");
      errors.push(`Categoría "${catInput.trim()}" no encontrada. Disponibles: ${available}`);
    }

    let brand: Brand | undefined;
    if (item.brand && typeof item.brand === "string" && (item.brand as string).trim()) {
      brand = brands.find((b) => normalizeText(b.name) === normalizeText(item.brand as string));
      if (!brand) {
        const available = brands.map((b) => b.name.trim()).join(", ");
        errors.push(`Marca "${(item.brand as string).trim()}" no encontrada. Disponibles: ${available}`);
      }
    }

    if (errors.length > 0) return { index, rawName, valid: false, errors };

    const imgs = Array.isArray(item.images)
      ? item.images
          .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
          .map((img) => img.trim())
      : [];
    return {
      index,
      rawName,
      valid: true,
      errors: [],
      payload: {
        name: (item.name as string).trim(),
        ...(item.description && typeof item.description === "string" ? { description: item.description } : {}),
        price: item.price as number,
        categoryId: cat!.id,
        ...(brand ? { brandId: brand.id } : {}),
        image: imgs[0] ?? PRODUCT_PLACEHOLDER_IMAGE,
        ...(imgs.length > 1 ? { imageUrls: imgs.slice(1) } : {}),
        featured: typeof item.featured === "boolean" ? item.featured : false,
        visible: typeof item.visible === "boolean" ? item.visible : true,
        stock: typeof item.stock === "number" ? item.stock : 0,
      },
    };
  });
}

/* ── Import JSON Dialog ── */
function ImportJsonDialog({
  categories,
  brands,
  authHeaders,
  invalidate,
  children,
}: {
  categories: Category[] | undefined;
  brands: Brand[] | undefined;
  authHeaders: Record<string, string>;
  invalidate: (k: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setProgress({ done: 0, total: 0, failed: 0 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    setOpen(v);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed: unknown = JSON.parse(ev.target?.result as string);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        setRows(validateImportRows(items, categories ?? [], brands ?? []));
        setStep("preview");
      } catch {
        toast.error("El archivo no es un JSON válido");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";
    const valid = rows.filter((r) => r.valid && r.payload);
    setProgress({ done: 0, total: valid.length, failed: 0 });
    setStep("importing");
    let failed = 0;
    for (let i = 0; i < valid.length; i++) {
      try {
        const res = await fetch(`${apiBase}/api/products`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(valid[i].payload),
        });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: valid.length, failed });
    }
    invalidate("/api/products");
    setStep("done");
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-[#111] border-white/10 rounded-none p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 border-b border-white/5 bg-[#0d0d0d] shrink-0">
          <DialogTitle className="font-serif text-base tracking-wide flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary" />
            Importar Productos — JSON
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {step === "upload" && (
            <div className="space-y-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Selecciona un archivo <span className="text-white/70 font-medium">.json</span> con un array de productos o un único objeto.
                Las categorías y marcas deben existir previamente en el sistema. Las imágenes son opcionales; si no las incluyes, se usará una imagen genérica.
              </p>
              <div
                className="border border-dashed border-white/15 hover:border-primary/40 transition-colors p-10 flex flex-col items-center gap-4 cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-7 w-7 text-primary/60" />
                <div className="text-center">
                  <p className="text-sm font-medium">Seleccionar archivo JSON</p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">o arrastra aquí</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
              <div className="bg-[#0d0d0d] border border-white/5 p-4">
                <p className="text-[10px] text-primary uppercase tracking-widest mb-3">Formato esperado</p>
                <pre className="text-[10px] text-muted-foreground leading-relaxed overflow-x-auto whitespace-pre">{`[\n  {\n    "name": "Rolex Datejust Gold",\n    "category": "Relojes",\n    "brand": "Rolex",\n    "price": 90000,\n    "featured": true,\n    "description": "Descripción del producto"\n  }\n]`}</pre>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Encontrados", value: rows.length, highlight: false },
                  { label: "Válidos", value: validCount, highlight: validCount > 0 },
                  { label: "Con errores", value: invalidCount, error: invalidCount > 0 },
                ].map(({ label, value, highlight, error }) => (
                  <div key={label} className={`bg-[#0d0d0d] border p-3 text-center ${error ? "border-destructive/30" : highlight ? "border-primary/20" : "border-white/5"}`}>
                    <p className={`text-2xl font-serif font-bold ${error ? "text-destructive" : highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {rows.map((row) => (
                  <div key={row.index} className={`flex items-start gap-3 p-2.5 text-xs ${row.valid ? "bg-[#0d0d0d]" : "bg-destructive/5 border border-destructive/15"}`}>
                    {row.valid
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      : <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{row.rawName}</p>
                      {row.errors.length > 0 && (
                        <p className="text-destructive/80 text-[10px] mt-0.5">{row.errors.join(" · ")}</p>
                      )}
                    </div>
                    {row.valid && row.payload && (
                      <span className="text-[10px] text-muted-foreground shrink-0">${formatPrice(row.payload.price)}</span>
                    )}
                  </div>
                ))}
              </div>
              {validCount === 0 && (
                <p className="text-xs text-destructive text-center py-2">No hay productos válidos para importar.</p>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="py-10 space-y-6 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Importando productos...</p>
                <p className="text-xs text-muted-foreground">{progress.done} de {progress.total}</p>
              </div>
              <div className="w-full bg-white/5 h-[2px]">
                <div className="h-[2px] bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{pct}%</p>
            </div>
          )}

          {step === "done" && (
            <div className="py-10 space-y-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <div>
                <p className="font-serif text-base font-semibold">Importación completada</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {progress.total - progress.failed} productos creados correctamente
                  {progress.failed > 0 && ` · ${progress.failed} con error`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 p-5 border-t border-white/5 flex justify-between gap-3">
          {step === "upload" && (
            <Button variant="ghost" onClick={() => handleClose(false)} className="rounded-none text-xs uppercase tracking-widest h-9">Cancelar</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={reset} className="rounded-none text-xs uppercase tracking-widest h-9">← Volver</Button>
              <Button onClick={handleImport} disabled={validCount === 0} className="rounded-none text-xs uppercase tracking-widest h-9">
                Importar {validCount} producto{validCount !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "importing" && <div />}
          {step === "done" && (
            <>
              <Button variant="ghost" onClick={reset} className="rounded-none text-xs uppercase tracking-widest h-9">Nueva importación</Button>
              <Button onClick={() => handleClose(false)} className="rounded-none text-xs uppercase tracking-widest h-9">Cerrar</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Product Dialog ── */
function ProductDialog({
  mode,
  product,
  categories,
  brands,
  onSubmit,
  children,
  forceOpen,
  onForceClose,
}: {
  mode: "create" | "edit";
  product?: Product;
  categories?: Category[];
  brands?: Brand[];
  onSubmit: (data: any) => void;
  children: React.ReactNode;
  forceOpen?: boolean;
  onForceClose?: () => void;
}) {
  const [open, setOpen] = useState(forceOpen ?? false);
  const blank = {
    name: "",
    description: "",
    price: "",
    categoryId: "",
    brandId: "none",
    images: [] as string[],
    featured: false,
    visible: true,
    stock: "10",
    isOnSale: false,
    originalPrice: "",
    salePrice: "",
    aiImageNotice: false,
    hasSizes: false,
    sizeTemplate: "",
    availableSizes: [] as string[],
  };
  const [variantesOpen, setVariantesOpen] = useState(false);

  const [form, setForm] = useState(blank);
  const { token } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const imageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  useEffect(() => {
    if (open) {
      const allImgs = product
        ? [product.image, ...(product.imageUrls ?? [])].filter(
            (url): url is string => Boolean(url) && url !== PRODUCT_PLACEHOLDER_IMAGE,
          )
        : [];
      setForm({
        name: product?.name ?? "",
        description: product?.description ?? "",
        price: product?.price?.toString() ?? "",
        categoryId: product?.categoryId?.toString() ?? "",
        brandId: product?.brandId?.toString() ?? "none",
        images: allImgs,
        featured: product?.featured ?? false,
        visible: product?.visible ?? true,
        stock: product?.stock?.toString() ?? "10",
        isOnSale: product?.isOnSale ?? false,
        originalPrice: product?.originalPrice?.toString() ?? "",
        salePrice: product?.salePrice?.toString() ?? "",
        aiImageNotice: (product as any)?.aiImageNotice ?? false,
        hasSizes: (product as any)?.hasSizes ?? false,
        sizeTemplate: (product as any)?.sizeTemplate ?? "",
        availableSizes: ((product as any)?.availableSizes as string[]) ?? [],
      });
      if ((product as any)?.hasSizes) setVariantesOpen(true);
    }
  }, [open, product]);

  const set = useCallback(
    (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v })),
    [],
  );

  const uploadImages = async (files: File[] | FileList) => {
    const selectedFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (selectedFiles.length === 0) {
      toast.error("Selecciona archivos de imagen válidos");
      return;
    }

    if (!token) {
      toast.error("Tu sesión de administrador expiró");
      return;
    }

    setIsUploadingImages(true);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";
      const signatureResponse = await fetch(
        `${apiBase}/api/admin/cloudinary-signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        },
      );

      if (!signatureResponse.ok) {
        throw new Error("No fue posible preparar la subida a Cloudinary");
      }

      const { cloudName, apiKey, timestamp, folder, signature } =
        await signatureResponse.json();

      const uploadedUrls = await Promise.all(
        selectedFiles.map(async (file) => {
          const body = new FormData();
          body.append("file", file);
          body.append("api_key", apiKey);
          body.append("timestamp", String(timestamp));
          body.append("folder", folder);
          body.append("signature", signature);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body },
          );

          if (!response.ok) {
            let detail = "";
            try {
              const errorBody = await response.json();
              detail = errorBody?.error?.message ? `: ${errorBody.error.message}` : "";
            } catch {
              // Cloudinary did not return JSON; keep the generic error.
            }
            throw new Error(`Cloudinary rechazó una imagen${detail}`);
          }

          const uploaded = await response.json();
          if (!uploaded.secure_url) {
            throw new Error("Cloudinary no devolvió la URL de la imagen");
          }
          return uploaded.secure_url as string;
        }),
      );

      setForm((current) => ({
        ...current,
        images: [...current.images.filter(Boolean), ...uploadedUrls],
      }));
      toast.success(
        `${uploadedUrls.length} imagen${uploadedUrls.length === 1 ? " subida" : "es subidas"} correctamente`,
      );
    } catch (error) {
      console.error("Error uploading product images", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al subir las imágenes a Cloudinary",
      );
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsFileDragging(false);
    if (!isUploadingImages && event.dataTransfer.files.length > 0) {
      void uploadImages(event.dataTransfer.files);
    }
  };

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = Number(String(active.id).replace("product-image-", ""));
    const newIndex = Number(String(over.id).replace("product-image-", ""));
    if (!Number.isInteger(oldIndex) || !Number.isInteger(newIndex)) return;

    setForm((current) => ({
      ...current,
      images: arrayMove(current.images, oldIndex, newIndex),
    }));
  };

  const addManualImage = () => {
    const url = manualImageUrl.trim();
    if (!url) return;
    setForm((current) => ({
      ...current,
      images: [...current.images.filter(Boolean), url],
    }));
    setManualImageUrl("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validImages = form.images.filter(Boolean);
    onSubmit({
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      categoryId: Number(form.categoryId),
      brandId: form.brandId === "none" ? null : Number(form.brandId),
      image: validImages[0] ?? PRODUCT_PLACEHOLDER_IMAGE,
      imageUrls: validImages.slice(1),
      featured: form.featured,
      visible: form.visible,
      stock: Number(form.stock),
      isOnSale: form.isOnSale,
      originalPrice: form.isOnSale && form.originalPrice ? Number(form.originalPrice) : null,
      salePrice: form.isOnSale && form.salePrice ? Number(form.salePrice) : null,
      aiImageNotice: form.aiImageNotice,
      hasSizes: form.hasSizes,
      sizeTemplate: form.hasSizes ? (form.sizeTemplate || null) : null,
      availableSizes: form.hasSizes ? form.availableSizes : [],
    });
    setOpen(false);
    onForceClose?.();
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) onForceClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[580px] bg-[#111] border-white/10 rounded-none p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-white/5 bg-[#0d0d0d]">
          <DialogTitle className="font-serif uppercase tracking-widest text-base">
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 max-h-[78vh] overflow-y-auto"
        >
          {/* Name */}
          <Field label="Nombre del producto">
            <Input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="Ej: Reloj Cronógrafo Negro"
            />
          </Field>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio ($)">
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Stock">
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Category + Brand */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <Select
                required
                value={form.categoryId}
                onValueChange={(v) => set("categoryId", v)}
              >
                <SelectTrigger className={`${inputCls} rounded-none`}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {categories?.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id.toString()}
                      className="text-xs"
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marca">
              <Select
                value={form.brandId}
                onValueChange={(v) => set("brandId", v)}
              >
                <SelectTrigger className={`${inputCls} rounded-none`}>
                  <SelectValue placeholder="Sin marca" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  <SelectItem
                    value="none"
                    className="text-xs text-muted-foreground"
                  >
                    Sin marca
                  </SelectItem>
                  {brands?.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id.toString()}
                      className="text-xs"
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Description */}
          <Field label="Descripción">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="rounded-none border-white/10 bg-[#0a0a0a] text-xs resize-none focus-visible:ring-primary"
              rows={3}
              placeholder="Descripción del producto…"
            />
          </Field>

          {/* Images */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Imágenes del producto
              </span>
              {form.images.length > 0 && (
                <span className="ml-auto text-[9px] uppercase tracking-widest text-muted-foreground/40">
                  {form.images.length} imagen{form.images.length !== 1 ? "es" : ""}
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) void uploadImages(event.target.files);
              }}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={() => !isUploadingImages && fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && !isUploadingImages) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!isUploadingImages) setIsFileDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                if (!isUploadingImages) setIsFileDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsFileDragging(false);
                }
              }}
              onDrop={handleImageDrop}
              className={`min-h-[132px] border border-dashed flex flex-col items-center justify-center gap-2 px-5 py-6 text-center transition-all cursor-pointer outline-none ${
                isFileDragging
                  ? "border-primary bg-primary/10"
                  : "border-white/15 bg-[#0a0a0a] hover:border-primary/50 hover:bg-primary/[0.03]"
              } ${isUploadingImages ? "cursor-wait opacity-75" : ""}`}
            >
              {isUploadingImages ? (
                <>
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <p className="text-xs font-medium">Subiendo a Cloudinary…</p>
                  <p className="text-[10px] text-muted-foreground/50">
                    No cierres esta ventana hasta que termine la carga.
                  </p>
                </>
              ) : (
                <>
                  <div className="h-9 w-9 border border-white/10 bg-white/[0.03] flex items-center justify-center">
                    <Upload className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs font-medium">
                    Arrastra tus imágenes aquí
                  </p>
                  <p className="text-[10px] text-muted-foreground/55">
                    o haz clic para elegir una o varias desde tu equipo
                  </p>
                </>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/45 leading-relaxed">
              Las imágenes se suben directamente a Cloudinary. Después puedes arrastrarlas para cambiar su orden; la primera será la imagen principal. Si no agregas ninguna, se mantendrá la imagen genérica.
            </p>

            {form.images.length > 0 && (
              <DndContext
                sensors={imageSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleImageDragEnd}
              >
                <SortableContext
                  items={form.images.map((_, index) => `product-image-${index}`)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {form.images.map((url, index) => (
                      <SortableProductImageCard
                        key={`product-image-${index}-${url}`}
                        id={`product-image-${index}`}
                        url={url}
                        index={index}
                        onRemove={() =>
                          setForm((current) => ({
                            ...current,
                            images: current.images.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div className="pt-1">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/35 mb-1.5">
                Enlace manual (opcional)
              </p>
              <div className="flex gap-2">
                <Input
                  value={manualImageUrl}
                  onChange={(event) => setManualImageUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addManualImage();
                    }
                  }}
                  placeholder="https://res.cloudinary.com/…"
                  className={inputCls}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addManualImage}
                  disabled={!manualImageUrl.trim()}
                  className="rounded-none h-9 px-3 text-[10px] uppercase tracking-widest"
                >
                  Añadir
                </Button>
              </div>
            </div>
          </div>

          {/* Sale / Oferta */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.isOnSale}
                onCheckedChange={(v) => set("isOnSale", v)}
              />
              <span className="text-[10px] uppercase tracking-widest text-amber-400">
                Producto en oferta
              </span>
            </label>

            {form.isOnSale && (
              <div className="grid grid-cols-2 gap-3 pl-0.5">
                <Field label="Precio anterior ($)">
                  <Input
                    required={form.isOnSale}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.originalPrice}
                    onChange={(e) => set("originalPrice", e.target.value)}
                    className={inputCls}
                    placeholder="Ej: 150000"
                  />
                </Field>
                <Field label="Precio oferta ($)">
                  <Input
                    required={form.isOnSale}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.salePrice}
                    onChange={(e) => set("salePrice", e.target.value)}
                    className={inputCls}
                    placeholder="Ej: 110000"
                  />
                </Field>
                {form.originalPrice && form.salePrice && Number(form.originalPrice) > 0 && Number(form.salePrice) > 0 && (
                  <div className="col-span-2 text-[10px] text-amber-400/80 tracking-wide">
                    Descuento: -{Math.round((1 - Number(form.salePrice) / Number(form.originalPrice)) * 100)}% · Ahorro: ${formatPrice(Number(form.originalPrice) - Number(form.salePrice))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/5">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => set("featured", v)}
              />
              <span className="text-[10px] uppercase tracking-widest text-primary">
                Destacado
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.visible}
                onCheckedChange={(v) => set("visible", v)}
              />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Visible
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.aiImageNotice}
                onCheckedChange={(v) => set("aiImageNotice", v)}
              />
              <span className="text-[10px] uppercase tracking-widest text-sky-400/80">
                Aviso imagen IA
              </span>
            </label>
          </div>

          {/* Variantes del producto */}
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setVariantesOpen((v) => !v)}
              className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground py-1.5 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                {form.hasSizes && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                )}
                Variantes del producto
              </span>
              <ChevronRight className={`h-3 w-3 transition-transform ${variantesOpen ? "rotate-90" : ""}`} />
            </button>

            {variantesOpen && (
              <div className="mt-3 space-y-4 pl-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={form.hasSizes}
                    onCheckedChange={(v) => {
                      set("hasSizes", v);
                      if (!v) { set("sizeTemplate", ""); set("availableSizes", []); }
                    }}
                  />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Este producto tiene tallas
                  </span>
                </label>

                {form.hasSizes && (
                  <div className="space-y-4">
                    <Field label="Plantilla de tallas">
                      <Select
                        value={form.sizeTemplate}
                        onValueChange={(v) => {
                          set("sizeTemplate", v);
                          set("availableSizes", SIZE_TEMPLATES[v] ?? []);
                        }}
                      >
                        <SelectTrigger className={inputCls}>
                          <SelectValue placeholder="Seleccionar plantilla..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {form.sizeTemplate && SIZE_TEMPLATES[form.sizeTemplate] && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                          Tallas disponibles <span className="text-muted-foreground/40 normal-case tracking-normal">— activa las que hay en stock</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SIZE_TEMPLATES[form.sizeTemplate].map((size) => {
                            const checked = (form.availableSizes as string[]).includes(size);
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  const curr = form.availableSizes as string[];
                                  set("availableSizes", checked
                                    ? curr.filter((s) => s !== size)
                                    : [...curr, size]
                                  );
                                }}
                                className={`px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-all ${
                                  checked
                                    ? "border-primary/60 text-primary bg-primary/5"
                                    : "border-white/10 text-muted-foreground/40"
                                }`}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground/40 mt-1.5 leading-relaxed">
                          Dorado = disponible · Gris = agotada (se muestra tachada en la tienda)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-none uppercase tracking-widest text-xs border-white/10 h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-none uppercase tracking-widest text-xs h-9"
            >
              {mode === "create" ? "Crear producto" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════ */
function CategoriesSection({
  authHeaders,
  invalidate,
}: {
  token: string;
  authHeaders: Record<string, string>;
  invalidate: (k: string) => void;
}) {
  const { data: categories } = useListCategories();

  const createCategory = useCreateCategory({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Categoría creada");
        invalidate("/api/categories");
      },
      onError: () => toast.error("Error al crear categoría"),
    },
  });

  const updateCategory = useUpdateCategory({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Categoría actualizada");
        invalidate("/api/categories");
      },
      onError: () => toast.error("Error al actualizar"),
    },
  });

  const deleteCategory = useDeleteCategory({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Categoría eliminada");
        invalidate("/api/categories");
      },
      onError: () =>
        toast.error("No se puede eliminar (tiene productos asignados)"),
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {categories?.length ?? 0} categorías
        </p>
        <CategoryDialog
          mode="create"
          onSubmit={(d) => createCategory.mutate({ data: d })}
        >
          <Button className="rounded-none uppercase tracking-widest text-xs h-9">
            <Plus className="h-3.5 w-3.5 mr-2" /> Nueva categoría
          </Button>
        </CategoryDialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map((cat) => (
          <div
            key={cat.id}
            className="bg-[#111] border border-white/5 overflow-hidden group"
          >
            {/* Banner */}
            <div className="h-28 bg-[#0a0a0a] relative overflow-hidden">
              {cat.image ? (
                <img
                  src={cloudinaryImage(cat.image)}
                  alt={cat.name}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-2 left-3">
                <p className="text-xs font-medium uppercase tracking-wider">
                  {cat.name}
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  /{cat.slug}
                </p>
              </div>
            </div>

            {/* Section badges */}
            <div className="px-3 pt-2.5 pb-1 flex gap-1.5 flex-wrap">
              {(cat as any).section1Title && (
                <span className="text-[9px] uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  {(cat as any).section1Title}
                </span>
              )}
              {(cat as any).section2Title && (
                <span className="text-[9px] uppercase tracking-widest bg-white/5 text-muted-foreground px-2 py-0.5 flex items-center gap-1">
                  <LayoutGrid className="h-2.5 w-2.5" />
                  {(cat as any).section2Title}
                </span>
              )}
              {!(cat as any).section1Title && !(cat as any).section2Title && (
                <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">
                  Sin secciones configuradas
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 flex items-center justify-between border-t border-white/5 mt-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {(cat as any).productCount ?? 0} productos
              </span>
              <div className="flex gap-1">
                <CategoryIconDialog
                  category={cat}
                  onSave={(d) => updateCategory.mutate({ id: cat.id, data: d })}
                >
                  <button
                    className="p-1.5 text-muted-foreground hover:text-primary"
                    title="Icono de categoría"
                  >
                    <span className="text-xs leading-none">
                      {cat.iconImageUrl ? "🖼" : (cat.iconEmoji || "✦")}
                    </span>
                  </button>
                </CategoryIconDialog>
                <CategorySectionsDialog
                  category={cat}
                  authHeaders={authHeaders}
                  onSave={(d) =>
                    updateCategory.mutate({ id: cat.id, data: d })
                  }
                >
                  <button
                    className="p-1.5 text-muted-foreground hover:text-primary"
                    title="Secciones promocionales"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                </CategorySectionsDialog>
                <CategoryDialog
                  mode="edit"
                  category={cat}
                  onSubmit={(d) =>
                    updateCategory.mutate({ id: cat.id, data: d })
                  }
                >
                  <button className="p-1.5 text-muted-foreground hover:text-foreground">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                </CategoryDialog>
                <button
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (
                      confirm(
                        `¿Eliminar categoría "${cat.name}"?\nSolo se puede eliminar si no tiene productos.`,
                      )
                    ) {
                      deleteCategory.mutate({ id: cat.id });
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Category Icon Dialog ── */
function CategoryIconDialog({
  category,
  onSave,
  children,
}: {
  category: Category;
  onSave: (data: { iconEmoji?: string | null; iconImageUrl?: string | null }) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (open) {
      setEmoji(category.iconEmoji ?? "");
      setImageUrl(category.iconImageUrl ?? "");
    }
  }, [open, category]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      iconEmoji: emoji.trim() || null,
      iconImageUrl: imageUrl.trim() || null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[380px] bg-[#111] border-white/10 rounded-none p-0">
        <DialogHeader className="p-5 border-b border-white/5 bg-[#0d0d0d]">
          <DialogTitle className="font-serif uppercase tracking-widest text-sm">
            Icono — {category.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            El icono aparece en el carrusel de categorías en la tienda. Si subiste una imagen se usa primero; si no, el emoji; si no hay ninguno, se usa el icono por defecto.
          </p>

          {/* Emoji */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Emoji (opcional)
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="⌚  🧢  👕  🧥  🎒"
              maxLength={4}
              className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              URL de imagen (opcional — Cloudinary recomendado)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/…/icono.png"
              className="w-full bg-transparent border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/30"
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="preview"
                className="h-10 w-10 object-contain mt-1 border border-white/10 p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
              />
            )}
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/5">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Vista previa:</span>
            <span className="flex flex-col items-center gap-0.5 px-3.5 py-1.5 border border-white/15 min-w-[60px] text-center">
              {imageUrl
                ? <img src={imageUrl} alt="" className="h-5 w-5 object-contain" />
                : <span className="text-lg leading-none">{emoji || "✦"}</span>
              }
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{category.name}</span>
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setEmoji(""); setImageUrl(""); }}
              className="flex-1 py-2 text-[10px] uppercase tracking-widest border border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground transition-colors"
            >
              Quitar icono
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-[10px] uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Category Dialog (create / edit basic info) ── */
function CategoryDialog({
  mode,
  category,
  onSubmit,
  children,
}: {
  mode: "create" | "edit";
  category?: Category;
  onSubmit: (data: any) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", image: "", tagline: "" });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setSlugTouched(false);
      setForm({
        name: category?.name ?? "",
        slug: category?.slug ?? "",
        image: (category as any)?.image ?? "",
        tagline: (category as any)?.tagline ?? "",
      });
    }
  }, [open, category]);

  const handleNameChange = (val: string) => {
    setForm((f) => ({
      ...f,
      name: val,
      slug: !slugTouched && mode === "create" ? toSlug(val) : f.slug,
    }));
  };

  const handleSlugChange = (val: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: val }));
  };

  const handleImageChange = (val: string) => {
    setForm((f) => ({ ...f, image: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      slug: form.slug,
      image: form.image || undefined,
      tagline: form.tagline || undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-[#111] border-white/10 rounded-none p-0">
        <DialogHeader className="p-5 border-b border-white/5 bg-[#0d0d0d]">
          <DialogTitle className="font-serif uppercase tracking-widest text-base">
            {mode === "create" ? "Nueva categoría" : "Editar categoría"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Nombre">
            <Input
              required
              autoFocus
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputCls}
              placeholder="Ej: Relojes Premium"
            />
          </Field>

          <Field
            label="Slug (URL)"
            hint={
              mode === "create"
                ? "Se genera automáticamente — puedes editarlo"
                : undefined
            }
          >
            <Input
              required
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={inputCls}
              placeholder="relojes-premium"
            />
          </Field>

          <ImageField
            label="Imagen de portada (opcional)"
            value={form.image}
            onChange={handleImageChange}
            hint="URL de imagen para el banner de la categoría. Sube a Cloudinary y pega la URL."
          />

          <Field
            label="Eslogan / Frase de categoría"
            hint="Frase corta que aparece debajo de las portadas. Ej: Accesorios con presencia limpia y estilo versátil."
          >
            <textarea
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              rows={2}
              maxLength={120}
              placeholder="Escribe aquí la frase que verán los visitantes…"
              className={`${inputCls} resize-none w-full`}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">
              {form.tagline.length}/120
            </p>
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-none text-xs h-9 border-white/10 uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-none text-xs h-9 uppercase tracking-widest"
            >
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Category Sections Dialog ── */
function CategorySectionsDialog({
  category,
  authHeaders,
  onSave,
  children,
}: {
  category: Category;
  authHeaders: Record<string, string>;
  onSave: (data: any) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

  const [s1Title, setS1Title] = useState("");
  const [s1Image, setS1Image] = useState("");
  const [s1Ids, setS1Ids] = useState<number[]>([]);

  const [s2Title, setS2Title] = useState("");
  const [s2Image, setS2Image] = useState("");
  const [s2Ids, setS2Ids] = useState<number[]>([]);

  const cat = category as any;

  const { data: categoryProducts } = useListProducts({ category: category.slug });

  useEffect(() => {
    if (open) {
      setS1Title(cat.section1Title ?? "");
      setS1Image(cat.section1Image ?? "");
      setS1Ids(cat.section1ProductIds ?? []);
      setS2Title(cat.section2Title ?? "");
      setS2Image(cat.section2Image ?? "");
      setS2Ids(cat.section2ProductIds ?? []);
    }
  }, [open]);

  const toggleProduct = (
    id: number,
    ids: number[],
    setIds: (v: number[]) => void,
  ) => {
    if (ids.includes(id)) {
      setIds(ids.filter((i) => i !== id));
    } else {
      setIds([...ids, id]);
    }
  };

  const handleSave = () => {
    onSave({
      section1Title: s1Title || null,
      section1Image: s1Image || null,
      section1ProductIds: s1Ids,
      section2Title: s2Title || null,
      section2Image: s2Image || null,
      section2ProductIds: s2Ids,
    });
    setOpen(false);
  };

  const tabCls = (t: 1 | 2) =>
    `flex-1 py-2.5 text-[10px] uppercase tracking-widest font-medium transition-colors border-b-2 ${
      activeTab === t
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  const ProductPicker = ({
    selected,
    onToggle,
  }: {
    selected: number[];
    onToggle: (id: number) => void;
  }) => {
    const [query, setQuery] = useState("");
    const all = categoryProducts ?? [];

    const sorted = useMemo(() => {
      const q = query.trim().toLowerCase();
      const filtered = q
        ? all.filter((p) => p.name.toLowerCase().includes(q))
        : all;
      return [
        ...filtered.filter((p) => selected.includes(p.id)),
        ...filtered.filter((p) => !selected.includes(p.id)),
      ];
    }, [all, selected, query]);

    return (
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full bg-white/5 border border-white/10 text-xs pl-7 pr-3 py-1.5 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {sorted.length > 0 ? (
            sorted.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggle(p.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-sm transition-colors text-left ${
                    checked
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="w-8 h-8 shrink-0 bg-muted overflow-hidden">
                    <img
                      src={cloudinaryImage(p.image)}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-medium">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      ${formatPrice(Number(p.price))}
                    </p>
                  </div>
                  {checked ? (
                    <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                </button>
              );
            })
          ) : (
            <p className="text-[10px] text-muted-foreground/50 text-center py-4 uppercase tracking-wider">
              {query ? "Sin resultados" : "No hay productos en esta categoría"}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-[#111] border-white/10 rounded-none p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-white/5 bg-[#0d0d0d]">
          <DialogTitle className="font-serif uppercase tracking-widest text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Secciones · {category.name}
          </DialogTitle>
          <p className="text-[10px] text-muted-foreground mt-1">
            Configura las secciones promocionales de esta categoría
          </p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-5">
          <button className={tabCls(1)} onClick={() => setActiveTab(1)}>
            Sección 1
          </button>
          <button className={tabCls(2)} onClick={() => setActiveTab(2)}>
            Sección 2
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 1 ? (
            <>
              <Field
                label="Título de sección 1"
                hint='Ej: "Lo Más Exclusivo", "Nuevos Modelos"'
              >
                <Input
                  value={s1Title}
                  onChange={(e) => setS1Title(e.target.value)}
                  className={inputCls}
                  placeholder="Lo Más Exclusivo"
                />
              </Field>
              <ImageField
                label="Imagen de sección 1 (opcional)"
                value={s1Image}
                onChange={setS1Image}
                hint="Imagen banner para esta sección. URL de Cloudinary."
              />
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Productos asignados a sección 1
                  {s1Ids.length > 0 && (
                    <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded-full">
                      {s1Ids.length}
                    </span>
                  )}
                </label>
                <ProductPicker
                  selected={s1Ids}
                  onToggle={(id) => toggleProduct(id, s1Ids, setS1Ids)}
                />
              </div>
            </>
          ) : (
            <>
              <Field
                label="Título de sección 2"
                hint='Ej: "Nuevas Referencias", "Colección Limitada"'
              >
                <Input
                  value={s2Title}
                  onChange={(e) => setS2Title(e.target.value)}
                  className={inputCls}
                  placeholder="Nuevas Referencias"
                />
              </Field>
              <ImageField
                label="Imagen de sección 2 (opcional)"
                value={s2Image}
                onChange={setS2Image}
                hint="Imagen banner para esta sección. URL de Cloudinary."
              />
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Productos asignados a sección 2
                  {s2Ids.length > 0 && (
                    <span className="bg-white/10 text-muted-foreground text-[9px] px-1.5 py-0.5 rounded-full">
                      {s2Ids.length}
                    </span>
                  )}
                </label>
                <ProductPicker
                  selected={s2Ids}
                  onToggle={(id) => toggleProduct(id, s2Ids, setS2Ids)}
                />
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-white/5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-none text-xs h-9 border-white/10 uppercase tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="rounded-none text-xs h-9 uppercase tracking-widest"
          >
            Guardar secciones
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════
   BRANDS
══════════════════════════════════════════════ */
function BrandsSection({
  authHeaders,
  invalidate,
}: {
  token: string;
  authHeaders: Record<string, string>;
  invalidate: (k: string) => void;
}) {
  const { data: brands } = useListBrands();

  const createBrand = useCreateBrand({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Marca creada");
        invalidate("/api/brands");
      },
      onError: () => toast.error("Error al crear marca"),
    },
  });

  const updateBrand = useUpdateBrand({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Marca actualizada");
        invalidate("/api/brands");
      },
      onError: () => toast.error("Error al actualizar"),
    },
  });

  const deleteBrand = useDeleteBrand({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Marca eliminada");
        invalidate("/api/brands");
      },
      onError: () => toast.error("No se puede eliminar (tiene productos)"),
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {brands?.length ?? 0} marcas
        </p>
        <BrandDialog
          mode="create"
          onSubmit={(d) => createBrand.mutate({ data: d })}
        >
          <Button className="rounded-none uppercase tracking-widest text-xs h-9">
            <Plus className="h-3.5 w-3.5 mr-2" /> Nueva marca
          </Button>
        </BrandDialog>
      </div>

      <div className="bg-[#111] border border-white/5 divide-y divide-white/5">
        {brands?.map((brand) => (
          <div
            key={brand.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-white/2"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/5 flex items-center justify-center">
                <Bookmark className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium tracking-wider">
                {brand.name}
              </span>
            </div>
            <div className="flex gap-1">
              <BrandDialog
                mode="edit"
                brand={brand}
                onSubmit={(d) =>
                  updateBrand.mutate({ id: brand.id, data: d })
                }
              >
                <button className="p-1.5 text-muted-foreground hover:text-foreground">
                  <Edit className="h-3.5 w-3.5" />
                </button>
              </BrandDialog>
              <button
                className="p-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm(`¿Eliminar marca "${brand.name}"?`)) {
                    deleteBrand.mutate({ id: brand.id });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {brands?.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-xs uppercase tracking-wider">
            No hay marcas
          </div>
        )}
      </div>
    </div>
  );
}

function BrandDialog({
  mode,
  brand,
  onSubmit,
  children,
}: {
  mode: "create" | "edit";
  brand?: Brand;
  onSubmit: (data: any) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(brand?.name ?? "");
  }, [open, brand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[360px] bg-[#111] border-white/10 rounded-none p-0">
        <DialogHeader className="p-5 border-b border-white/5 bg-[#0d0d0d]">
          <DialogTitle className="font-serif uppercase tracking-widest text-base">
            {mode === "create" ? "Nueva marca" : "Editar marca"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Nombre de marca">
            <Input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ej: Rolex, Hugo Boss…"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-none text-xs h-9 border-white/10 uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-none text-xs h-9 uppercase tracking-widest"
            >
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Marcas Destacadas Home ─────────────────────────────────────────── */

interface FeaturedBrandsSectionProps {
  token: string;
  authHeaders: Record<string, string>;
  invalidate: (key: string) => Promise<void>;
}

const blankFb = {
  brandId: "",
  imageUrl: "",
  imageMobileUrl: "",
  order: "0",
  active: true,
};

/* ── Sortable brand card ── */
function SortableBrandCard({
  fb,
  onEdit,
  onDelete,
  onToggle,
  isDragging,
}: {
  fb: FeaturedBrand;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSelf } = useSortable({ id: fb.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isSelf ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border-b border-white/5 bg-[#111] ${isDragging ? "shadow-2xl border border-primary/30 rounded" : "hover:bg-white/[0.02]"} transition-colors`}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors shrink-0 touch-none"
        title="Arrastra para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Image */}
      <div className="w-9 h-12 bg-muted overflow-hidden shrink-0">
        {fb.imageUrl
          ? <img src={cloudinaryImage(fb.imageUrl)} alt={fb.brandName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-3.5 w-3.5 text-muted-foreground/30" /></div>}
      </div>

      {/* Name */}
      <p className="flex-1 text-xs font-medium truncate">{fb.brandName}</p>

      {/* Active toggle */}
      <button
        className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium transition-colors shrink-0 ${fb.active ? "text-emerald-400" : "text-muted-foreground/40"}`}
        onClick={onToggle}
      >
        {fb.active ? <><Eye className="h-3 w-3" /> Activa</> : <><EyeOff className="h-3 w-3" /> Inactiva</>}
      </button>

      {/* Edit / Delete */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={onEdit} className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function FeaturedBrandsSection({ authHeaders, invalidate }: FeaturedBrandsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<FeaturedBrand | null>(null);
  const [form, setForm] = useState(blankFb);
  const [localOrder, setLocalOrder] = useState<FeaturedBrand[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: featuredBrands, refetch } = useListAllFeaturedBrands({
    request: { headers: authHeaders },
  });
  const { data: brands } = useListBrands();

  const createFb = useCreateFeaturedBrand({ request: { headers: authHeaders } });
  const updateFb = useUpdateFeaturedBrand({ request: { headers: authHeaders } });
  const deleteFb = useDeleteFeaturedBrand({ request: { headers: authHeaders } });

  const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";

  // Keep localOrder in sync with server data
  const sorted = (featuredBrands ?? []).slice().sort((a, b) => a.order - b.order);
  const sortedKey = sorted.map((f) => f.id).join(",");
  const localKey = localOrder.map((f) => f.id).join(",");
  if (sortedKey !== localKey) setLocalOrder(sorted);

  const refresh = () => { invalidate("listAllFeaturedBrands"); invalidate("listFeaturedBrands"); refetch(); };

  const openAdd = () => { setEditingItem(null); setForm(blankFb); setShowForm(true); };
  const openEdit = (fb: FeaturedBrand) => {
    setEditingItem(fb);
    setForm({ brandId: String(fb.brandId), imageUrl: fb.imageUrl, imageMobileUrl: fb.imageMobileUrl ?? "", order: String(fb.order), active: fb.active });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { brandId: Number(form.brandId), imageUrl: form.imageUrl.trim(), imageMobileUrl: form.imageMobileUrl.trim() || undefined, order: Number(form.order), active: form.active };
    try {
      if (editingItem) { await updateFb.mutateAsync({ id: editingItem.id, data: payload }); toast.success("Marca destacada actualizada."); }
      else { await createFb.mutateAsync({ data: payload }); toast.success("Marca añadida al carrusel."); }
      setShowForm(false); refresh();
    } catch { toast.error("Error al guardar."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta marca del carrusel?")) return;
    await deleteFb.mutateAsync({ id }); toast.success("Marca eliminada."); refresh();
  };

  const toggleActive = async (fb: FeaturedBrand) => {
    await updateFb.mutateAsync({ id: fb.id, data: { active: !fb.active } }); refresh();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localOrder.findIndex((f) => f.id === active.id);
    const newIndex = localOrder.findIndex((f) => f.id === over.id);
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);

    // Persist new positions
    setSaving(true);
    try {
      await Promise.all(
        newOrder.map((fb, i) =>
          fetch(`${apiBase}/api/featured-brands/${fb.id}`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ order: i }),
          }),
        ),
      );
      refresh();
    } catch {
      toast.error("Error al guardar el orden.");
    } finally {
      setSaving(false);
    }
  };

  const activeItem = activeId ? localOrder.find((f) => f.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Marcas Destacadas Home</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carrusel &quot;Nuestras Marcas&quot; en el inicio. Arrastra para reordenar.
            {saving && <span className="ml-2 text-primary animate-pulse">Guardando…</span>}
          </p>
        </div>
        <Button size="sm" onClick={openAdd} className="rounded-none text-xs uppercase tracking-widest h-9 gap-2">
          <Plus className="h-3.5 w-3.5" /> Añadir marca
        </Button>
      </div>

      {showForm && (
        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border border-white/8 bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{editingItem ? "Editar marca destacada" : "Nueva marca destacada"}</p>
            <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <Field label="Marca">
            <Select value={form.brandId} onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))} required>
              <SelectTrigger className={`${inputCls} w-full`}><SelectValue placeholder="Selecciona una marca…" /></SelectTrigger>
              <SelectContent>{(brands ?? []).map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <ImageField label="Imagen desktop" hint="URL de Cloudinary. Tarjeta vertical en el carrusel." value={form.imageUrl} onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))} required />
          <ImageField label="Imagen móvil (opcional)" hint="Si no se especifica, se usa la imagen desktop." value={form.imageMobileUrl} onChange={(v) => setForm((f) => ({ ...f, imageMobileUrl: v }))} />
          <div className="flex items-center gap-2 pb-0.5">
            <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            <span className="text-xs text-muted-foreground">Activa</span>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-none text-xs h-9 border-white/10 uppercase tracking-widest">Cancelar</Button>
            <Button type="submit" className="rounded-none text-xs h-9 uppercase tracking-widest">{editingItem ? "Guardar cambios" : "Añadir al carrusel"}</Button>
          </div>
        </motion.form>
      )}

      {localOrder.length === 0 ? (
        <div className="border border-dashed border-white/10 p-10 text-center">
          <Star className="h-7 w-7 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aún no hay marcas en el carrusel.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Añade una marca con imagen para que aparezca en el home.</p>
        </div>
      ) : (
        <div className="border border-white/5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] border-b border-white/5">
            <div className="w-4 shrink-0" />
            <div className="w-9 shrink-0" />
            <p className="flex-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Marca</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-16 text-center">Estado</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-16 text-right">Acciones</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={localOrder.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {localOrder.map((fb) => (
                <SortableBrandCard
                  key={fb.id}
                  fb={fb}
                  onEdit={() => openEdit(fb)}
                  onDelete={() => handleDelete(fb.id)}
                  onToggle={() => toggleActive(fb)}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeItem && (
                <SortableBrandCard
                  fb={activeItem}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onToggle={() => {}}
                  isDragging
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   SOLICITUDES DE COMPRA
══════════════════════════════════════════════ */
const STATUS_LABELS: Record<string, string> = {
  nueva: "Nueva",
  contactado: "Contactado",
  venta_finalizada: "Venta Finalizada",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  nueva: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  contactado: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  venta_finalizada: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  cancelada: "text-red-400 bg-red-400/10 border-red-400/30",
};

/* ────────────────────────────────── STATS ────────────────────────────────── */

type RangePreset = "7" | "30" | "90" | "3m" | "year" | "lastyear" | "custom";

const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DAYS_ES   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function fmtShortDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1].slice(0, 3)}`;
}

function fmtTooltipLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return `${DAYS_ES[dt.getDay()]} ${parseInt(d)} de ${MONTHS_ES[parseInt(m) - 1]}`;
}

function fmtHeaderDate(dateStr: string, showYear = false) {
  const [y, m, d] = dateStr.split("-");
  const base = `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]}`;
  return showYear ? `${base} ${y}` : base;
}

function getQueryParams(preset: RangePreset, from: string, to: string) {
  if (preset === "custom" && from && to) return { from, to };
  const today = new Date().toISOString().slice(0, 10);
  const year  = new Date().getFullYear();
  if (preset === "year")     return { from: `${year}-01-01`, to: today };
  if (preset === "lastyear") return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
  const daysMap: Record<string, number> = { "7": 7, "30": 30, "90": 90, "3m": 90 };
  return { days: daysMap[preset] };
}

function getTickInterval(len: number): number {
  if (len <=  7) return 0;
  if (len <= 14) return 1;
  if (len <= 30) return 4;
  if (len <= 60) return 6;
  return 9;
}

const PRESET_LABELS: Record<RangePreset, string> = {
  "7":        "Últimos 7 días",
  "30":       "Últimos 30 días",
  "90":       "Últimos 90 días",
  "3m":       "Últimos 3 meses",
  "year":     "Este año",
  "lastyear": "Año anterior",
  "custom":   "Personalizado",
};

function StatsSection({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [preset, setPreset]       = useState<RangePreset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [showVentas, setShowVentas] = useState(false);
  const [showContactados, setShowContactados] = useState(false);
  const [showCanceladas, setShowCanceladas] = useState(false);

  const queryParams = getQueryParams(preset, customFrom, customTo);

  const { data: stats, isLoading } = useGetPurchaseRequestStats(queryParams, {
    request: { headers: authHeaders },
  });

  /* ── Derive range header text from actual byDay data ── */
  const byDay = stats?.byDay ?? [];
  const rangeFrom  = byDay[0]?.date ?? "";
  const rangeTo    = byDay[byDay.length - 1]?.date ?? "";

  /* ── Merge all series into single chart dataset ── */
  const byDayVentas      = stats?.byDayVentas      ?? [];
  const byDayContactados = (stats as any)?.byDayContactados ?? [];
  const byDayCanceladas  = (stats as any)?.byDayCanceladas  ?? [];
  const byDayRevenue     = (stats as any)?.byDayRevenue     ?? [];
  const chartData = byDay.map((d, i) => ({
    date:        d.date,
    count:       d.count,
    ventas:      byDayVentas[i]?.count      ?? 0,
    contactados: byDayContactados[i]?.count ?? 0,
    canceladas:  byDayCanceladas[i]?.count  ?? 0,
    revenue:     byDayRevenue[i]?.revenue   ?? 0,
  }));
  const showYear   = rangeFrom.slice(0, 4) !== new Date().getFullYear().toString();
  const headerRange = rangeFrom && rangeTo
    ? `${fmtHeaderDate(rangeFrom, showYear)} — ${fmtHeaderDate(rangeTo, true)}`
    : PRESET_LABELS[preset];

  const CARD_CONFIGS = stats
    ? [
        { label: "Solicitudes Totales",  value: stats.summary.total,             color: "text-foreground" },
        { label: "Contactados",          value: stats.summary.contactado,        color: "text-blue-400" },
        { label: "Ventas Finalizadas",   value: stats.summary.venta_finalizada,  color: "text-emerald-400" },
        { label: "Canceladas",           value: stats.summary.cancelada,         color: "text-red-400" },
        {
          label: "Tasa de Conversión",
          value: `${stats.summary.conversionRate}%`,
          color: stats.summary.conversionRate >= 50 ? "text-emerald-400" : "text-yellow-400",
        },
        {
          label: "Ingresos Totales",
          value: `$${formatPrice((stats.summary as any).ingresoTotal ?? 0)}`,
          color: "text-emerald-400",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-serif font-bold uppercase tracking-widest mb-1">Estadísticas</h2>
        <p className="text-xs text-muted-foreground">Rendimiento general de la tienda basado en las solicitudes registradas.</p>
      </div>

      {/* ── Summary cards ── */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando estadísticas...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CARD_CONFIGS.map((c) => (
              <div key={c.label} className="border border-white/5 bg-white/[0.02] p-4 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">{c.label}</p>
                <p className={`text-2xl font-bold font-serif ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* ── Line chart ── */}
          <div className="border border-white/5 bg-white/[0.02] p-5">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
              <div>
                <p className="text-base font-medium">{headerRange}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{PRESET_LABELS[preset]} · Solicitudes por día</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Ventas toggle */}
                <button
                  type="button"
                  onClick={() => setShowVentas((v) => !v)}
                  className={`flex items-center gap-2 h-8 px-3 border text-[11px] transition-colors ${
                    showVentas
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                      : "border-white/10 bg-transparent text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <span className={`w-7 h-3.5 relative inline-flex rounded-full transition-colors ${showVentas ? "bg-emerald-500" : "bg-white/15"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${showVentas ? "translate-x-3.5" : "translate-x-0"}`} />
                  </span>
                  Ventas finalizadas
                </button>

                {/* Contactados toggle */}
                <button
                  type="button"
                  onClick={() => setShowContactados((v) => !v)}
                  className={`flex items-center gap-2 h-8 px-3 border text-[11px] transition-colors ${
                    showContactados
                      ? "border-blue-400/40 bg-blue-400/10 text-blue-400"
                      : "border-white/10 bg-transparent text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <span className={`w-7 h-3.5 relative inline-flex rounded-full transition-colors ${showContactados ? "bg-blue-500" : "bg-white/15"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${showContactados ? "translate-x-3.5" : "translate-x-0"}`} />
                  </span>
                  Contactados
                </button>

                {/* Canceladas toggle */}
                <button
                  type="button"
                  onClick={() => setShowCanceladas((v) => !v)}
                  className={`flex items-center gap-2 h-8 px-3 border text-[11px] transition-colors ${
                    showCanceladas
                      ? "border-red-400/40 bg-red-400/10 text-red-400"
                      : "border-white/10 bg-transparent text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <span className={`w-7 h-3.5 relative inline-flex rounded-full transition-colors ${showCanceladas ? "bg-red-500" : "bg-white/15"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${showCanceladas ? "translate-x-3.5" : "translate-x-0"}`} />
                  </span>
                  Canceladas
                </button>

                {/* Dropdown selector */}
                <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
                  <SelectTrigger className="w-44 h-8 rounded-none border-white/10 bg-transparent text-xs text-muted-foreground focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-white/10 bg-[#111] text-xs">
                    {(Object.entries(PRESET_LABELS) as [RangePreset, string][]).map(([id, label]) => (
                      <SelectItem key={id} value={id} className="text-xs focus:bg-white/5 focus:text-foreground cursor-pointer">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom date pickers */}
            {preset === "custom" && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-transparent border border-white/10 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-transparent border border-white/10 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            )}

            {/* Area / line chart */}
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ffffff" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#34d399" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="contactadosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="canceladasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f87171" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtShortDate}
                    tick={{ fontSize: 10, fill: "#666" }}
                    axisLine={false}
                    tickLine={false}
                    interval={getTickInterval(chartData.length)}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#666" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as typeof chartData[0];
                      return (
                        <div style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.6)", padding: "10px 14px" }}>
                          <p style={{ color: "#aaa", fontSize: 11, marginBottom: 6 }}>{fmtTooltipLabel(label)}</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "2px 0" }}>Solicitudes : {d.count}</p>
                          {showVentas && <p style={{ fontSize: 13, fontWeight: 600, color: "#34d399", margin: "2px 0" }}>Ventas finalizadas : {d.ventas}</p>}
                          {showVentas && d.revenue > 0 && <p style={{ fontSize: 12, color: "#34d399", margin: "2px 0", opacity: 0.8 }}>Ingreso estimado : ${Number(d.revenue).toLocaleString("es-CO")}</p>}
                          {showContactados && <p style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa", margin: "2px 0" }}>Contactados : {d.contactados}</p>}
                          {showCanceladas && <p style={{ fontSize: 13, fontWeight: 600, color: "#f87171", margin: "2px 0" }}>Canceladas : {d.canceladas}</p>}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#ffffff"
                    strokeWidth={2}
                    fill="url(#lineGrad)"
                    dot={{ r: 3, fill: "#ffffff", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#ffffff", stroke: "#111", strokeWidth: 2 }}
                  />
                  {showVentas && (
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      stroke="#34d399"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      fill="url(#ventasGrad)"
                      dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#34d399", stroke: "#111", strokeWidth: 2 }}
                    />
                  )}
                  {/* revenue leído directamente del payload en el tooltip personalizado — sin Area para no distorsionar el eje Y */}
                  {showContactados && (
                    <Area
                      type="monotone"
                      dataKey="contactados"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      fill="url(#contactadosGrad)"
                      dot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#60a5fa", stroke: "#111", strokeWidth: 2 }}
                    />
                  )}
                  {showCanceladas && (
                    <Area
                      type="monotone"
                      dataKey="canceladas"
                      stroke="#f87171"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      fill="url(#canceladasGrad)"
                      dot={{ r: 3, fill: "#f87171", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#f87171", stroke: "#111", strokeWidth: 2 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">Sin datos para este período.</p>
            )}
          </div>

          {/* ── Rankings grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RankingTable title="Productos más solicitados"  rows={stats?.topProducts   ?? []} emptyLabel="Sin datos" suffix="sol." />
            <RankingTable title="Marcas más solicitadas"     rows={stats?.topBrands     ?? []} emptyLabel="Sin datos" suffix="sol." />
            <RankingTable title="Categorías más solicitadas" rows={stats?.topCategories ?? []} emptyLabel="Sin datos" suffix="sol." />
            <TopSharedTable authHeaders={authHeaders} />
            <div className="border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-widest font-medium mb-4">Clientes recurrentes</p>
              {(stats?.topClients ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {(stats?.topClients ?? []).map((c, i) => (
                    <div key={c.phone} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className="text-[11px] text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {c.phone}
                        </p>
                      </div>
                      <span className="text-[11px] text-primary shrink-0">{c.count} sol.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TopSharedTable({ authHeaders }: { authHeaders: Record<string, string> }) {
  const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";
  const { data: rows = [], isLoading } = useQuery<{ name: string; shareCount: number }[]>({
    queryKey: ["top-shared"],
    queryFn: async () => {
      const r = await fetch(`${apiBase}/api/products/top-shared`, { headers: authHeaders });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 30_000,
  });

  const max = rows[0]?.shareCount ?? 1;
  return (
    <div className="border border-white/5 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-widest font-medium mb-4 flex items-center gap-2">
        <Share2 className="h-3 w-3 text-primary/70" />
        Productos más compartidos
      </p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Sin datos aún</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={r.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                  <span className="text-xs truncate">{r.name}</span>
                </div>
                <span className="text-[11px] text-primary shrink-0 ml-2">{r.shareCount} comp.</span>
              </div>
              <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(r.shareCount / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankingTable({
  title,
  rows,
  emptyLabel,
  suffix,
}: {
  title: string;
  rows: { name: string; count: number }[];
  emptyLabel: string;
  suffix: string;
}) {
  const max = rows[0]?.count ?? 1;
  return (
    <div className="border border-white/5 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-widest font-medium mb-4">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{emptyLabel}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={r.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                  <span className="text-xs truncate">{r.name}</span>
                </div>
                <span className="text-[11px] text-primary shrink-0 ml-2">{r.count} {suffix}</span>
              </div>
              <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestsSection({
  authHeaders,
  invalidate,
}: {
  authHeaders: Record<string, string>;
  invalidate: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";

  const { data: requests, isLoading } = useListPurchaseRequests({
    request: { headers: authHeaders },
  });

  const invalidateAll = () => {
    invalidate("/api/purchase-requests");
    invalidate("/api/purchase-requests/stats");
  };

  const updateRequest = useUpdatePurchaseRequest({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Estado actualizado");
        invalidateAll();
      },
      onError: () => toast.error("Error al actualizar"),
    },
  });

  const deleteRequest = useDeletePurchaseRequest({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Solicitud eliminada");
        invalidateAll();
        setExpanded(null);
      },
      onError: () => toast.error("Error al eliminar"),
    },
  });

  const resetSequence = useResetPurchaseRequestSequence({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => {
        toast.success("Contador reiniciado. La próxima solicitud será #1.");
        invalidate("/api/purchase-requests");
      },
      onError: () => toast.error("No se puede reiniciar: la tabla no está vacía."),
    },
  });

  const setStatus = (id: number, status: string) => {
    updateRequest.mutate({ id, data: { status: status as PurchaseRequest["status"] } });
  };

  const toggleContacted = (req: PurchaseRequest) => {
    setStatus(req.id, req.status === "contactado" ? "nueva" : "contactado");
  };

  const filtered = requests
    ? statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter)
    : [];

  const counts = requests
    ? {
        total: requests.length,
        nueva: requests.filter((r) => r.status === "nueva").length,
        contactado: requests.filter((r) => r.status === "contactado").length,
        venta_finalizada: requests.filter((r) => r.status === "venta_finalizada").length,
        cancelada: requests.filter((r) => r.status === "cancelada").length,
      }
    : null;

  const toggleOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)));
  };

  const bulkSetStatus = async (status: string) => {
    setBulkPending(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`${apiBase}/api/purchase-requests/${id}`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }),
        ),
      );
      toast.success(`${selected.size} solicitud${selected.size > 1 ? "es" : ""} actualizada${selected.size > 1 ? "s" : ""}`);
      setSelected(new Set());
      invalidateAll();
    } catch {
      toast.error("Error en la acción masiva");
    } finally {
      setBulkPending(false);
    }
  };

  const bulkSetContacted = async () => {
    setBulkPending(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`${apiBase}/api/purchase-requests/${id}`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "contactado" }),
          }),
        ),
      );
      toast.success(`${selected.size} solicitud${selected.size > 1 ? "es" : ""} marcada${selected.size > 1 ? "s" : ""} como contactada${selected.size > 1 ? "s" : ""}`);
      setSelected(new Set());
      invalidateAll();
    } catch {
      toast.error("Error en la acción masiva");
    } finally {
      setBulkPending(false);
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} solicitud${selected.size > 1 ? "es" : ""}? Esta acción no se puede deshacer.`)) return;
    setBulkPending(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`${apiBase}/api/purchase-requests/${id}`, { method: "DELETE", headers: authHeaders }),
        ),
      );
      toast.success(`${selected.size} solicitud${selected.size > 1 ? "es" : ""} eliminada${selected.size > 1 ? "s" : ""}`);
      setSelected(new Set());
      setExpanded(null);
      invalidateAll();
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {counts ? `${counts.total} solicitudes` : "Cargando..."}
        </p>
      </div>

      {/* Stats pills */}
      {counts && (
        <div className="flex flex-wrap gap-2">
          {(["all", "nueva", "contactado", "venta_finalizada", "cancelada"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setSelected(new Set()); }}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest border transition-all ${
                statusFilter === s
                  ? "border-primary/60 text-primary bg-primary/5"
                  : "border-white/10 text-muted-foreground hover:border-white/20"
              }`}
            >
              {s === "all" ? `Todas (${counts.total})` : `${STATUS_LABELS[s]} (${counts[s]})`}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap items-center gap-2 p-3 border border-primary/30 bg-primary/5"
          >
            <span className="text-xs font-medium text-primary mr-1">
              {selected.size} seleccionada{selected.size > 1 ? "s" : ""}
            </span>
            <button
              disabled={bulkPending}
              onClick={bulkSetContacted}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-widest border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-40 transition-colors"
            >
              <Phone className="h-3 w-3" /> Contactado
            </button>
            <button
              disabled={bulkPending}
              onClick={() => bulkSetStatus("venta_finalizada")}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-widest border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40 transition-colors"
            >
              <CheckCircle className="h-3 w-3" /> Venta finalizada
            </button>
            <button
              disabled={bulkPending}
              onClick={() => bulkSetStatus("cancelada")}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-widest border border-red-400/30 text-red-400 hover:bg-red-400/10 disabled:opacity-40 transition-colors"
            >
              <XCircle className="h-3 w-3" /> Cancelar
            </button>
            <button
              disabled={bulkPending}
              onClick={bulkDelete}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-widest border border-white/10 text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-40 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Eliminar
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Deseleccionar todo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando solicitudes...
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="relative py-16 text-center text-muted-foreground text-sm">
          <p>No hay solicitudes {statusFilter !== "all" ? `con estado "${STATUS_LABELS[statusFilter]}"` : "todavía"}.</p>
          {requests && requests.length === 0 && statusFilter === "all" && (
            <button
              onClick={() => {
                if (window.confirm("¿Reiniciar el contador de solicitudes? La próxima solicitud será #1.")) {
                  resetSequence.mutate();
                }
              }}
              disabled={resetSequence.isPending}
              className="absolute top-3 right-0 flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-white/30 transition-colors disabled:opacity-40"
            >
              {resetSequence.isPending ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Reiniciando...</>
              ) : (
                "↺ Reiniciar contador"
              )}
            </button>
          )}
        </div>
      )}

      {/* Table (desktop) / Cards (mobile) */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[1.5rem_2rem_1fr_1fr_1fr_6rem_7rem_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-white/5">
            <button
              onClick={toggleAll}
              className={`w-4 h-4 border flex items-center justify-center transition-colors ${selected.size === filtered.length && filtered.length > 0 ? "border-primary bg-primary/20 text-primary" : "border-white/20 hover:border-white/40"}`}
            >
              {selected.size === filtered.length && filtered.length > 0 && <CheckSquare className="h-3 w-3" />}
            </button>
            <span>#</span>
            <span>Nombre</span>
            <span>Teléfono</span>
            <span>Correo</span>
            <span>Total</span>
            <span>Estado</span>
            <span></span>
          </div>

          {filtered.map((req) => (
            <div key={req.id} className={`border border-white/5 transition-colors ${selected.has(req.id) ? "bg-primary/[0.04] border-l-2 border-l-primary/40" : "bg-white/[0.01] hover:bg-white/[0.02]"}`}>
              {/* Row */}
              <div
                className="grid grid-cols-[1.5rem_1fr_auto] md:grid-cols-[1.5rem_2rem_1fr_1fr_1fr_6rem_7rem_auto] gap-3 items-center px-3 py-2.5 cursor-pointer"
                onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleOne(req.id, e)}
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${selected.has(req.id) ? "border-primary bg-primary/20 text-primary" : "border-white/20 hover:border-white/40"}`}
                >
                  {selected.has(req.id) && <CheckSquare className="h-3 w-3" />}
                </button>

                {/* Mobile layout */}
                <div className="md:contents">
                  <div className="md:hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider border ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                      <span className="text-muted-foreground text-[10px]">#{req.id}</span>
                    </div>
                    <p className="text-sm font-medium">{req.name}</p>
                    <p className="text-xs text-muted-foreground">{req.phone}</p>
                    <p className="text-xs text-primary mt-0.5">${formatPrice(Number(req.total))}</p>
                  </div>

                  {/* Desktop cells */}
                  <span className="hidden md:block text-xs text-muted-foreground">{req.id}</span>
                  <span className="hidden md:block text-sm font-medium truncate">{req.name}</span>
                  <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" /> {req.phone}
                  </span>
                  <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                    {req.email ? <><Mail className="h-3 w-3 shrink-0" />{req.email}</> : <span className="italic opacity-40">—</span>}
                  </span>
                  <span className="hidden md:block text-xs font-medium text-primary">${formatPrice(Number(req.total))}</span>
                  <span className={`hidden md:inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider border ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>

                <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expanded === req.id ? "rotate-180" : ""}`} />
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {expanded === req.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-4 pt-1 border-t border-white/5 space-y-4">
                      {/* Purchase type badge */}
                      <div className="flex items-center gap-2">
                        {req.purchaseMethod === "contra_entrega" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-wider border border-amber-400/40 text-amber-400 bg-amber-400/5">
                            📦 Contra entrega
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-wider border border-green-400/40 text-green-400 bg-green-400/5">
                            💬 WhatsApp
                          </span>
                        )}
                      </div>

                      {/* Contact info */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Nombre</p>
                          <p>{req.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Teléfono</p>
                          <p>{req.phone}</p>
                        </div>
                        {req.email && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Correo</p>
                            <p className="truncate">{req.email}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Fecha</p>
                          <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(req.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</p>
                        </div>
                      </div>

                      {/* Delivery address (contra entrega only) */}
                      {req.purchaseMethod === "contra_entrega" && (req.city || req.address) && (
                        <div className="border border-amber-400/10 bg-amber-400/[0.03] p-3 space-y-2">
                          <p className="text-[10px] text-amber-400/70 uppercase tracking-widest font-semibold">Dirección de entrega</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {req.city && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Ciudad</p>
                                <p>{req.city}</p>
                              </div>
                            )}
                            {req.address && (
                              <div className="col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Dirección</p>
                                <p>{req.address}</p>
                              </div>
                            )}
                            {req.neighborhood && (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Barrio</p>
                                <p>{req.neighborhood}</p>
                              </div>
                            )}
                            {req.addressRef && (
                              <div className="col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Referencia</p>
                                <p>{req.addressRef}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Products */}
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Productos</p>
                        <div className="space-y-1.5">
                          {(req.items as Array<{ productId: number; name: string; image: string; price: number; quantity: number }>).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/[0.02] p-2">
                              <div className="w-8 h-10 shrink-0 bg-muted overflow-hidden">
                                {item.image
                                  ? <img src={cloudinaryImage(item.image)} alt={item.name} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-3 w-3 text-muted-foreground/30" /></div>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground">Cant: {item.quantity} · ${formatPrice(item.price)} c/u</p>
                              </div>
                              <p className="text-xs font-medium shrink-0">${formatPrice(item.price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-2 border-t border-white/5 mt-2">
                          <p className="text-xs"><span className="text-muted-foreground mr-2">Total estimado</span><span className="font-semibold text-primary">${formatPrice(Number(req.total))}</span></p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Toggle del estado contactado */}
                          <button
                            onClick={() => toggleContacted(req)}
                            className={`flex items-center justify-center gap-2 px-3 py-3 md:py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
                              req.status === "contactado"
                                ? "border-amber-400/60 bg-amber-400/15 text-amber-300 hover:bg-amber-400/5"
                                : "border-amber-400/30 text-amber-400 hover:bg-amber-400/10 active:bg-amber-400/20"
                            }`}
                          >
                            <Phone className="h-3.5 w-3.5 md:h-3 md:w-3" />
                            {req.status === "contactado" ? "✓ Contactado" : "Contactar"}
                          </button>
                          {req.status !== "venta_finalizada" && (
                            <button
                              onClick={() => setStatus(req.id, "venta_finalizada")}
                              className="flex items-center justify-center gap-2 px-3 py-3 md:py-1.5 text-[10px] uppercase tracking-widest border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 active:bg-emerald-400/20 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5 md:h-3 md:w-3" /> Venta finalizada
                            </button>
                          )}
                          {req.status !== "cancelada" && (
                            <button
                              onClick={() => setStatus(req.id, "cancelada")}
                              className="flex items-center justify-center gap-2 px-3 py-3 md:py-1.5 text-[10px] uppercase tracking-widest border border-red-400/30 text-red-400 hover:bg-red-400/10 active:bg-red-400/20 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5 md:h-3 md:w-3" /> Cancelar
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("¿Eliminar esta solicitud?")) {
                              deleteRequest.mutate({ id: req.id });
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-1.5 text-[10px] uppercase tracking-widest border border-white/10 text-muted-foreground hover:border-destructive/40 hover:text-destructive active:bg-destructive/5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 md:h-3 md:w-3" /> Eliminar solicitud
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
