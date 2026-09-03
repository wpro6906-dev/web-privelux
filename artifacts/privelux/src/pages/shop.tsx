import { Layout } from "@/components/layout";
import { ProductCard } from "@/components/product-card";
import { useListProducts, useListCategories, type Product, type Category } from "@workspace/api-client-react";
import { cloudinaryImage } from "@/lib/format";
import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const LOGO_PL =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png";

/* ── Smart search utilities ─────────────────────────────────────────────── */

/** Strip diacritics, lowercase, trim */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .trim();
}

/** Levenshtein distance with early-exit for large deltas */
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const n = b.length;
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const curr = Math.min(
        row[j] + 1,
        prev + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      row[j - 1] = prev;
      prev = curr;
    }
    row[n] = prev;
  }
  return row[n];
}

/**
 * Score a product against a query string.
 * Returns 0 = no match, >0 = match (higher = more relevant).
 *
 * Priority:
 *  100 exact name       90 exact brand      85 exact category
 *   80 name contains    75 brand contains   70 category contains
 *   60 all words found  40 description      20 fuzzy (≤2 edits)
 */
function scoreProduct(p: Product, rawQuery: string): number {
  const q = norm(rawQuery);
  if (!q) return 1;

  const name  = norm(p.name);
  const brand = norm(p.brandName ?? "");
  const cat   = norm(p.categoryName ?? "");
  const desc  = norm(p.description ?? "");

  if (name  === q) return 100;
  if (brand === q) return 90;
  if (cat   === q) return 85;

  if (name.includes(q))  return 80;
  if (brand.includes(q)) return 75;
  if (cat.includes(q))   return 70;
  if (desc.includes(q))  return 40;

  const qWords   = q.split(/\s+/).filter(Boolean);
  const allText  = `${name} ${brand} ${cat} ${desc}`;

  if (qWords.length > 1 && qWords.every((w) => allText.includes(w))) return 60;

  /* Fuzzy: each query word vs every token in the combined fields */
  const tokens = allText.split(/\s+/).filter((t) => t.length >= 2);
  let hits = 0;
  for (const qw of qWords) {
    if (qw.length < 3) continue;
    const threshold = qw.length <= 4 ? 1 : 2;
    if (tokens.some((t) => lev(qw, t) <= threshold)) hits++;
  }
  if (hits > 0 && hits >= qWords.length * 0.7) return 20;

  return 0;
}

/* ── Smart catalog ordering ─────────────────────────────────────────────── */

/** Sort by date then alternate: newest, oldest, 2nd newest, 2nd oldest … */
function interleaveByDate(products: Product[]): Product[] {
  const sorted = [...products].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const out: Product[] = [];
  let lo = 0, hi = sorted.length - 1, fromFront = true;
  while (lo <= hi) {
    out.push(fromFront ? sorted[lo++] : sorted[hi--]);
    fromFront = !fromFront;
  }
  return out;
}

/**
 * Group products by `keyFn`, interleave new↔old within each group,
 * then greedy round-robin across groups (biggest ≠ last key first).
 */
function roundRobinGroups<K extends string>(
  products: Product[],
  keyFn: (p: Product) => K,
): Product[] {
  const map = new Map<K, Product[]>();
  for (const p of products) {
    const k = keyFn(p);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  const queues = Array.from(map.values()).map(interleaveByDate);
  const result: Product[] = [];
  let lastKey: K | "" = "";
  while (queues.some((q) => q.length > 0)) {
    const nonEmpty = queues.filter((q) => q.length > 0);
    const different = nonEmpty.filter((q) => keyFn(q[0]) !== lastKey);
    const pool = (different.length > 0 ? different : nonEmpty)
      .sort((a, b) => b.length - a.length);
    const chosen = pool[0].shift()!;
    lastKey = keyFn(chosen);
    result.push(chosen);
  }
  return result;
}

/**
 * Full catalog ordering (no filters active):
 *  1. Featured products first:
 *     - round-robin by category (prevents same-category runs)
 *     - new↔old interleaved within each category (prevents all-new or all-old runs)
 *  2. Rest: round-robin by category, new↔old interleaved within each
 */
function smartOrder(products: Product[]): Product[] {
  const featured = products.filter((p) => p.featured);
  const rest     = products.filter((p) => !p.featured);
  return [
    ...roundRobinGroups(featured, (p) => p.categoryName ?? "__none__"),
    ...roundRobinGroups(rest,     (p) => p.categoryName ?? "__none__"),
  ];
}

/* ── Category icon map ──────────────────────────────────────────────────── */

const CATEGORY_ICONS: Record<string, string> = {
  watches:      "⌚",
  caps:         "🧢",
  "t-shirts":   "👕",
  hoodies:      "🧥",
  jackets:      "🧥",
  accessories:  "🎒",
  bags:         "👜",
  shoes:        "👟",
  belts:        "🪢",
  perfumes:     "🧴",
  sunglasses:   "🕶️",
  /* fallbacks en español por si cambian los slugs */
  relojes:      "⌚",
  gorras:       "🧢",
  camisetas:    "👕",
  busos:        "🧥",
  accesorios:   "🎒",
};

function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug.toLowerCase()] ?? "✦";
}

/** Resolve icon for a category: DB image > DB emoji > hardcoded map > fallback */
function resolveCategoryIcon(c: Category): { kind: "image"; url: string } | { kind: "emoji"; value: string } {
  if (c.iconImageUrl) return { kind: "image", url: c.iconImageUrl };
  if (c.iconEmoji)    return { kind: "emoji", value: c.iconEmoji };
  return { kind: "emoji", value: getCategoryIcon(c.slug) };
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function Shop() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const initialCategory = searchParams.get("category") || undefined;
  const initialBrand    = searchParams.get("brand")    || undefined;

  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [brand,    setBrand]    = useState<string | undefined>(initialBrand);
  const [featured, setFeatured] = useState(searchParams.get("featured") === "true");

  /* ── Mobile category carousel ── */
  const carouselRef        = useRef<HTMLDivElement>(null);
  const carouselPaused     = useRef(false);
  const carouselPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let raf: number;
    let last = 0;
    const SPEED = 52; // px/second
    const tick = (now: number) => {
      if (!carouselPaused.current) {
        const dt = last ? (now - last) / 1000 : 0;
        last = now;
        el.scrollLeft += SPEED * dt;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      } else {
        last = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pauseCarousel = () => {
    carouselPaused.current = true;
    if (carouselPauseTimer.current) clearTimeout(carouselPauseTimer.current);
    carouselPauseTimer.current = setTimeout(() => {
      carouselPaused.current = false;
    }, 2500);
  };

  /* Fetch products filtered by category/brand/featured server-side.
     Search is applied client-side for richer matching. */
  const { data: rawProducts, isLoading: productsLoading } = useListProducts({
    category: category && category !== "all" ? category : undefined,
    brand:    brand    && brand    !== "all" ? brand    : undefined,
    featured: featured ? true : undefined,
    visible:  true,
  });

  const { data: categories } = useListCategories();

  /* Brand dropdown — derived from products before text-search is applied */
  const availableBrands = useMemo(() => {
    if (!rawProducts) return [];
    const seen = new Set<string>();
    return rawProducts
      .filter((p) => p.brandName)
      .map((p) => ({ id: p.brandId!, name: p.brandName! }))
      .filter(({ name }) => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
  }, [rawProducts]);

  /* Apply smart search + smart ordering client-side */
  const products = useMemo(() => {
    if (!rawProducts) return undefined;
    const q           = search.trim();
    const catActive   = Boolean(category && category !== "all");
    const brandActive = Boolean(brand    && brand    !== "all");

    /* Search active → rank by relevance only */
    if (q) {
      return rawProducts
        .map((p) => ({ p, score: scoreProduct(p, q) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p);
    }

    /* No filters → full smart order (featured first, round-robin by category) */
    if (!catActive && !brandActive) return smartOrder(rawProducts);

    /* Category only → round-robin by brand, new↔old interleaved */
    if (catActive && !brandActive)
      return roundRobinGroups(rawProducts, (p) => p.brandName ?? "__none__");

    /* Brand active (with or without category) → interleave new↔old */
    return interleaveByDate(rawProducts);
  }, [rawProducts, search, category, brand]);

  return (
    <Layout>
      <div className="bg-card py-6 border-b border-border relative overflow-hidden">
        <img
          src={LOGO_PL}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="eager"
          className="absolute right-5 top-3 h-16 w-auto object-contain opacity-[0.35] select-none pointer-events-none"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <div className="container mx-auto px-4 relative">
          <h1 className="text-2xl font-serif font-bold uppercase tracking-widest mb-2">
            {featured ? "Destacados" : "Catálogo"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            Todo lo que necesitas para destacar, en un solo lugar.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-5 pb-8">
        {/* Search bar — full width at the top */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos, marcas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none border-border bg-transparent focus-visible:ring-primary"
          />
        </div>

        {/* Category navigation links */}
        {categories && categories.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
              Ir a una categoría
            </p>

            {/* ── Desktop: pills con icono — exactamente igual al diseño anterior ── */}
            <div className="hidden md:flex md:flex-wrap gap-2">
              {categories.map((c) => {
                const icon = resolveCategoryIcon(c);
                return (
                  <Link key={c.id} href={`/categoria/${c.slug}`}>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-widest border border-border/40 text-muted-foreground hover:border-foreground/60 hover:text-foreground transition-all duration-200 cursor-pointer">
                      {icon.kind === "image"
                        ? <img src={cloudinaryImage(icon.url)} alt="" className="h-4 w-4 object-contain" />
                        : <span className="text-sm leading-none">{icon.value}</span>
                      }
                      {c.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* ── Mobile: carrusel horizontal infinito compacto ── */}
            <div
              ref={carouselRef}
              className="md:hidden flex gap-2.5 overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
              onTouchStart={pauseCarousel}
              onMouseDown={pauseCarousel}
            >
              {/* Duplicamos para efecto infinito continuo */}
              {[...categories, ...categories].map((c, i) => {
                const icon = resolveCategoryIcon(c);
                return (
                  <Link
                    key={`${c.id}-${i}`}
                    href={`/categoria/${c.slug}`}
                    onClick={pauseCarousel}
                  >
                    <span className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3.5 py-1.5 border border-border/40 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all duration-200 cursor-pointer min-w-[60px] text-center">
                      {icon.kind === "image"
                        ? <img src={cloudinaryImage(icon.url)} alt="" className="h-5 w-5 object-contain" />
                        : <span className="text-lg leading-none">{icon.value}</span>
                      }
                      <span className="text-[9px] uppercase tracking-widest whitespace-nowrap">{c.name}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Featured filter chip — active or inactive toggle */}
        <AnimatePresence mode="wait">
          {featured ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center gap-3 mb-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 border border-primary/40 bg-primary/5 text-primary text-xs uppercase tracking-widest">
                <Star className="h-3 w-3 fill-primary" />
                <span>Destacados</span>
              </div>
              <button
                onClick={() => setFeatured(false)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors duration-200 group"
              >
                <X className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-200" />
                Ver catálogo completo
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center gap-3 mb-3"
            >
              <button
                onClick={() => setFeatured(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-xs uppercase tracking-widest transition-all duration-200 group"
              >
                <Star className="h-3 w-3 group-hover:fill-primary transition-all duration-200" />
                Ver solo destacados
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact category + brand filters — just above the grid */}
        <div className="flex items-center gap-2 mb-3">
          <span className="hidden md:block text-[10px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">
            Filtrar:
          </span>
          <Select value={category || "all"} onValueChange={(v) => setCategory(v)}>
            <SelectTrigger className="flex-1 h-8 rounded-none border-border/50 bg-transparent text-xs">
              <SelectValue>
                {(!category || category === "all")
                  ? <><span className="md:hidden">Categorías</span><span className="hidden md:inline">Todas las categorías</span></>
                  : <span>{categories?.find(c => c.slug === category)?.name ?? category}</span>
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brand || "all"} onValueChange={(v) => setBrand(v)}>
            <SelectTrigger className="flex-1 h-8 rounded-none border-border/50 bg-transparent text-xs">
              <SelectValue>
                {(!brand || brand === "all")
                  ? <><span className="md:hidden">Marca</span><span className="hidden md:inline">Todas las marcas</span></>
                  : <span>{brand}</span>
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las marcas</SelectItem>
              {availableBrands.map((b) => (
                <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-b border-border/30 mb-5" />

        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          {productsLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[3/4] w-full rounded-none" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))
          ) : products?.length === 0 ? (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              No se encontraron productos con esos filtros.
            </div>
          ) : (
            products?.map((product) => (
              <motion.div
                key={product.id}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
                }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
