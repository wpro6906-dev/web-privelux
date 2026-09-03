import { Layout } from "@/components/layout";
import { ProductCard } from "@/components/product-card";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { useParams, useSearch, Link } from "wouter";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { cloudinaryImage } from "@/lib/format";
import watchImg from "@/assets/images/watch.png";
import capImg from "@/assets/images/cap.png";
import hoodieImg from "@/assets/images/hoodie.png";
import tshirtImg from "@/assets/images/tshirt.png";
import jacketImg from "@/assets/images/jacket.png";
import accessoriesImg from "@/assets/images/accessories.png";

const LOGO_PL =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png";

const FALLBACK_IMAGES: Record<string, string> = {
  watches: watchImg,
  caps: capImg,
  hoodies: hoodieImg,
  "t-shirts": tshirtImg,
  jackets: jacketImg,
  accessories: accessoriesImg,
};

const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  watches: "Diseños modernos con detalles que marcan diferencia.",
  caps: "Accesorios con presencia limpia y estilo versátil.",
  hoodies: "Prendas cómodas, de buen gramaje y diseño limpio.",
  "t-shirts": "Referencias nuevas y estilos para todos los días.",
  jackets: "Detalles que combinan con cualquier outfit.",
  accessories: "Accesorios con presencia minimalista y moderna.",
};

function PromoBanner({
  title,
  sub,
  image,
  href,
  deactivateHref,
  index,
  active,
}: {
  title: string;
  sub: string;
  image: string;
  href: string;
  deactivateHref: string;
  index: number;
  active: boolean;
}) {
  return (
    <Link href={active ? deactivateHref : href}>
      <motion.div
        className="relative overflow-hidden group cursor-pointer h-[42vh] md:h-[55vh]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.12 }}
      >
        <img
          src={cloudinaryImage(image)}
          alt={title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${
            active ? "scale-[1.04] brightness-[0.55]" : "group-hover:scale-[1.04]"
          }`}
        />

        {/* Base gradients */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5 transition-opacity duration-500 ${active ? "opacity-60" : "opacity-100"}`} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Active: amber overlay tint */}
        <AnimatePresence>
          {active && (
            <motion.div
              key="active-overlay"
              className="absolute inset-0 bg-amber-400/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          )}
        </AnimatePresence>

        {/* Active: animated border */}
        <AnimatePresence>
          {active && (
            <motion.div
              key="active-border"
              className="absolute inset-0 ring-2 ring-inset ring-primary pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Logo */}
        <img
          src={LOGO_PL}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="lazy"
          className="absolute top-4 left-5 h-7 w-auto object-contain opacity-[0.50] select-none pointer-events-none"
          style={{ filter: "brightness(0) invert(1)" }}
        />

        {/* Active: centered badge */}
        <AnimatePresence>
          {active && (
            <motion.div
              key="active-center"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <CheckCircle2 className="h-8 w-8 text-primary drop-shadow-lg" strokeWidth={1.5} />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-[0.35em] text-primary font-semibold">
                  Filtro activo
                </span>
                <span className="text-[10px] text-white/50 uppercase tracking-widest">
                  Toca para ver todo
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom text — dimmed when active */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 md:p-8 transition-opacity duration-500 ${active ? "opacity-30" : "opacity-100"}`}>
          <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">{sub}</p>
          <h3 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-tight">
            {title}
          </h3>
          <div className="mt-3 w-0 group-hover:w-10 h-[1px] bg-primary transition-all duration-500 ease-out" />
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Brand-interleaving helper ────────────────────────────────────────────
   Rules (applied in this order):
   1. Featured products appear before non-featured.
   2. Within each group (featured / rest), brands are round-robin interleaved.
   3. Within each brand's slot, products alternate newest ↔ oldest so recent
      and older references both get visibility.
   Filters, search and pagination are applied upstream — this just reorders.
──────────────────────────────────────────────────────────────────────────── */
function interleaveBrands<T extends { brandName?: string | null; createdAt: string }>(
  products: T[]
): T[] {
  if (products.length === 0) return products;

  const byBrand = new Map<string, T[]>();
  const noBrand: T[] = [];

  for (const p of products) {
    const brand = p.brandName ?? "";
    if (!brand) { noBrand.push(p); continue; }
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    byBrand.get(brand)!.push(p);
  }

  if (byBrand.size <= 1) return products;

  /* Within each brand: sort newest-first, then weave front/back so that
     position 0 = newest, 1 = oldest, 2 = 2nd newest, 3 = 2nd oldest, … */
  const queues = Array.from(byBrand.values()).map((group) => {
    const sorted = [...group].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const mixed: T[] = [];
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo <= hi) {
      mixed.push(sorted[lo++]);
      if (lo <= hi) mixed.push(sorted[hi--]);
    }
    return mixed;
  });

  /* Round-robin across brands */
  const result: T[] = [];
  let i = 0;
  while (queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length];
    if (q.length > 0) result.push(q.shift()!);
    i++;
  }

  return [...result, ...noBrand];
}

export function CategoryPage() {
  const { slug } = useParams();
  const search = useSearch();
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>();

  const searchParams = new URLSearchParams(search);
  const activeSection = searchParams.get("section") as "1" | "2" | null;

  const { data: categories, isLoading: categoriesLoading } = useListCategories();

  /* Fetch ALL products for this category — filtering by section is done client-side */
  const { data: allProducts, isLoading: productsLoading } = useListProducts({
    category: slug,
    visible: true,
  });

  const category = categories?.find((c) => c.slug === slug);
  const cat = category as any;

  /* IDs assigned to each section — from the DB (already an array of numbers) */
  const section1Ids: number[] = cat?.section1ProductIds ?? [];
  const section2Ids: number[] = cat?.section2ProductIds ?? [];

  /* Derive displayed products: if a section is active, filter by its assigned IDs.
     An active section with no assigned IDs intentionally shows nothing. */
  const displayedProducts = useMemo(() => {
    if (!allProducts) return [];
    if (activeSection === "1") {
      const idSet = new Set(section1Ids);
      return allProducts.filter((p) => idSet.has(p.id));
    }
    if (activeSection === "2") {
      const idSet = new Set(section2Ids);
      return allProducts.filter((p) => idSet.has(p.id));
    }
    return allProducts;
  }, [allProducts, activeSection, section1Ids, section2Ids]);

  /* Apply brand filter on top of section filter */
  const filteredProducts = useMemo(() => {
    if (!selectedBrand) return displayedProducts;
    return displayedProducts.filter((p) => p.brandName === selectedBrand);
  }, [displayedProducts, selectedBrand]);

  /* Sort category products with all 5 rules applied:
     1. Featured first  2. Featured interleaved by brand
     3. Rest interleaved by brand  4. New ↔ old mix within each brand
     5. Respects upstream filters (brand pill, section) — only reorders */
  const interleavedProducts = useMemo(() => {
    const featured = filteredProducts.filter((p) => p.featured);
    const rest = filteredProducts.filter((p) => !p.featured);
    return [...interleaveBrands(featured), ...interleaveBrands(rest)];
  }, [filteredProducts]);

  /* Derive available brand pills from section-filtered (pre-brand-filter) products */
  const availableBrands = useMemo(() => {
    const seen = new Set<string>();
    return displayedProducts
      .filter((p) => p.brandName)
      .map((p) => ({ id: p.brandId!, name: p.brandName! }))
      .filter((p) => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });
  }, [displayedProducts]);

  if (categoriesLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 flex items-center justify-center">
          <Skeleton className="h-6 w-40" />
        </div>
      </Layout>
    );
  }

  if (!categoriesLoading && !category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-serif mb-4">Categoría no encontrada</h1>
          <p className="text-muted-foreground mb-8">La categoría que buscas no existe.</p>
          <Link href="/shop">
            <Button className="rounded-none uppercase tracking-widest">Ver Tienda</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const fallbackImg = FALLBACK_IMAGES[slug ?? ""] ?? watchImg;

  const banner1 = {
    title: cat?.section1Title ?? "Colección Destacada",
    sub: "",
    image: cat?.section1Image ?? fallbackImg,
    href: `/categoria/${slug}?section=1`,
  };

  const banner2 = {
    title: cat?.section2Title ?? "Nuevas Referencias",
    sub: "",
    image: cat?.section2Image ?? fallbackImg,
    href: `/categoria/${slug}?section=2`,
  };

  const description =
    (category as any)?.tagline ||
    FALLBACK_DESCRIPTIONS[slug ?? ""] ||
    "Productos con presencia, detalles limpios y estética moderna.";

  const activeSectionTitle =
    activeSection === "1" ? banner1.title :
    activeSection === "2" ? banner2.title : null;

  /* Gender map by slug — needed for correct Spanish agreement */
  const FEMININE_SLUGS = new Set(["caps", "t-shirts", "jackets"]);
  const isFeminine = FEMININE_SLUGS.has(slug ?? "");
  const catName = (category?.name ?? "").toLowerCase();
  const verTodosDesktop = isFeminine
    ? `Ver todas las ${catName}`
    : `Ver todos los ${catName}`;
  const verTodosMobile = isFeminine
    ? `Todas las ${catName}`
    : `Todos los ${catName}`;

  return (
    <Layout>
      {/* Header */}
      <section className="bg-background">
        <motion.div
          className="container mx-auto px-4 pt-10 pb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/shop">
            <span className="inline-flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground border border-border/50 hover:border-foreground/40 px-3 py-1.5 uppercase tracking-widest transition-all duration-200 cursor-pointer mb-5 group">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform duration-200"><path d="m15 18-6-6 6-6"/></svg>
              Ver catálogo completo
            </span>
          </Link>
          <p className="text-[10px] text-primary uppercase tracking-widest mb-1">Categoría</p>
          <h1 className="font-serif text-xl md:text-2xl font-semibold tracking-wide">
            {category?.name}
          </h1>
        </motion.div>

        {/* Promotional banners — each links to its own section filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
          <PromoBanner
            title={banner1.title}
            sub={banner1.sub}
            image={banner1.image}
            href={banner1.href}
            deactivateHref={`/categoria/${slug}`}
            index={0}
            active={activeSection === "1"}
          />
          <PromoBanner
            title={banner2.title}
            sub={banner2.sub}
            image={banner2.image}
            href={banner2.href}
            deactivateHref={`/categoria/${slug}`}
            index={1}
            active={activeSection === "2"}
          />
        </div>

        <motion.div
          className="container mx-auto px-4 py-5 border-b border-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
              {description}
            </p>
        </motion.div>
      </section>

      {/* Brand filter pills */}
      <div className="container mx-auto px-4 py-5 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedBrand(undefined)}
          data-testid="brand-filter-all"
          className={
            !selectedBrand
              ? "border border-primary text-primary bg-primary/10 text-xs uppercase tracking-wider px-4 py-2 cursor-pointer"
              : "border border-border bg-transparent text-muted-foreground text-xs uppercase tracking-wider px-4 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors"
          }
        >
          Todas las marcas
        </button>
        {availableBrands.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBrand(b.name)}
            data-testid={`brand-filter-${b.name}`}
            className={
              selectedBrand === b.name
                ? "border border-primary text-primary bg-primary/10 text-xs uppercase tracking-wider px-4 py-2 cursor-pointer"
                : "border border-border bg-transparent text-muted-foreground text-xs uppercase tracking-wider px-4 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors"
            }
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="container mx-auto px-4 pb-16">
        {activeSectionTitle && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-5 border-b border-border/30">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Mostrando</p>
              <p className="font-serif text-base text-foreground/90 tracking-wide">{activeSectionTitle}</p>
            </div>
            <Link href={`/categoria/${slug}`}>
              <span className="group inline-flex items-center gap-2.5 text-[11px] text-primary uppercase tracking-widest cursor-pointer transition-colors hover:text-primary/70">
                <span className="w-8 h-[1px] bg-primary origin-left scale-x-[0.625] group-hover:scale-x-100 transition-transform duration-300" />
                <span className="hidden sm:inline">{verTodosDesktop}</span>
                <span className="sm:hidden">{verTodosMobile}</span>
              </span>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {productsLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-none" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))
          ) : interleavedProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              {activeSection
                ? "Esta sección aún no tiene productos asignados."
                : "No se encontraron productos en esta categoría."}
            </div>
          ) : (
            <motion.div
              className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
            >
              {interleavedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Back to full catalog — visible at the bottom after browsing */}
      <div className="border-t border-border/30 py-12">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            ¿Buscas algo más?
          </p>
          <Link href="/shop">
            <Button
              variant="outline"
              className="rounded-none px-8 py-3 text-xs tracking-widest uppercase border-foreground/40 hover:border-foreground hover:bg-foreground/10 transition-all duration-300 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2 group-hover:-translate-x-0.5 transition-transform duration-200"><path d="m15 18-6-6 6-6"/></svg>
              Ver catálogo completo
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
