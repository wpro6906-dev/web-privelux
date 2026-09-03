import { Layout } from "@/components/layout";
import { BrandsCarousel } from "@/components/brands-carousel";
import { cloudinaryImage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useListFeaturedProducts, useListCategories, type Product } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
const HERO_IMG =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779991053/ChatGPT_Image_28_may_2026_12_55_21_cecpst.png";
import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import watchImg from "@/assets/images/watch.png";
import capImg from "@/assets/images/cap.png";
import hoodieImg from "@/assets/images/hoodie.png";
import tshirtImg from "@/assets/images/tshirt.png";
import jacketImg from "@/assets/images/jacket.png";
import accessoriesImg from "@/assets/images/accessories.png";

const LOGO_CHARACTER =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985097/Dise%C3%B1o_sin_t%C3%ADtulo_qbcusw.png";
const LOGO_PL =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png";

/* Fallback images by slug for categories that don't have a DB banner */
const FALLBACK_IMAGES: Record<string, string> = {
  watches: watchImg,
  caps: capImg,
  hoodies: hoodieImg,
  "t-shirts": tshirtImg,
  jackets: jacketImg,
  accessories: accessoriesImg,
};

/* ── Featured ordering helpers ──────────────────────────────────────────── */

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

function roundRobinByCategory(products: Product[]): Product[] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const k = p.categoryName ?? "__none__";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  const queues = Array.from(map.values()).map(interleaveByDate);
  const result: Product[] = [];
  let lastKey = "";
  while (queues.some((q) => q.length > 0)) {
    const nonEmpty = queues.filter((q) => q.length > 0);
    const different = nonEmpty.filter((q) => (q[0].categoryName ?? "__none__") !== lastKey);
    const pool = (different.length > 0 ? different : nonEmpty).sort((a, b) => b.length - a.length);
    const chosen = pool[0].shift()!;
    lastKey = chosen.categoryName ?? "__none__";
    result.push(chosen);
  }
  return result;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function Home() {
  const { data: rawFeatured, isLoading: featuredLoading } = useListFeaturedProducts();

  const featuredProducts = useMemo(
    () => (rawFeatured ? roundRobinByCategory(rawFeatured) : undefined),
    [rawFeatured],
  );
  const { data: dbCategories } = useListCategories();

  /* Build the display list from DB, falling back to local images */
  const categories = useMemo(() => {
    if (!dbCategories || dbCategories.length === 0) return [];
    return dbCategories.map((cat) => ({
      slug: cat.slug,
      label: cat.name,
      image: cat.image ?? FALLBACK_IMAGES[cat.slug] ?? watchImg,
    }));
  }, [dbCategories]);

  /* Triple the list so there are always enough slides for Embla loop */
  const extendedCategories = useMemo(
    () => (categories.length > 0 ? [...categories, ...categories, ...categories] : []),
    [categories],
  );

  const [, navigate] = useLocation();

  /* ── Category carousel RAF state ── */
  const CAT_SPEED         = 0.45;   // px/frame (~27 px/s @ 60 fps)
  const CAT_FRICTION      = 0.92;
  const CAT_COAST_MIN     = 0.15;
  const CAT_RESUME_MS     = 1800;

  type CatPhase = "autoplay" | "dragging" | "coasting" | "paused";
  const catTrackRef    = useRef<HTMLDivElement>(null);
  const catRafRef      = useRef<number | null>(null);
  const catPosRef      = useRef(0);
  const catOneSetRef   = useRef(0);
  const catPhaseRef    = useRef<CatPhase>("autoplay");
  const catVelRef      = useRef(0);
  const catResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catDragRef     = useRef<{ startX: number; startPos: number; lastX: number; lastT: number } | null>(null);

  function catMeasure() {
    return catTrackRef.current ? catTrackRef.current.scrollWidth / 3 : 0;
  }

  function catNorm(p: number, one: number) {
    let n = p;
    while (n < -2 * one) n += one;
    while (n > 0)          n -= one;
    return n;
  }

  function catScheduleResume(delay = CAT_RESUME_MS) {
    if (catResumeTimer.current) clearTimeout(catResumeTimer.current);
    catResumeTimer.current = setTimeout(() => {
      if (catPhaseRef.current !== "dragging") catPhaseRef.current = "autoplay";
    }, delay);
  }

  /* RAF loop */
  useEffect(() => {
    if (extendedCategories.length === 0) return;

    function loop() {
      const one = catMeasure();
      catOneSetRef.current = one;

      switch (catPhaseRef.current) {
        case "autoplay":
          catPosRef.current -= CAT_SPEED;
          break;
        case "coasting":
          catVelRef.current *= CAT_FRICTION;
          catPosRef.current += catVelRef.current;
          if (Math.abs(catVelRef.current) < CAT_COAST_MIN) {
            catPhaseRef.current = "paused";
            catScheduleResume();
          }
          break;
        default:
          break;
      }

      if (one > 0) catPosRef.current = catNorm(catPosRef.current, one);
      if (catTrackRef.current) {
        catTrackRef.current.style.transform = `translateX(${catPosRef.current}px)`;
      }
      catRafRef.current = requestAnimationFrame(loop);
    }

    const init = setTimeout(() => {
      catOneSetRef.current = catMeasure();
      catPosRef.current    = -catOneSetRef.current;
      catPhaseRef.current  = "autoplay";
      catRafRef.current    = requestAnimationFrame(loop);
    }, 80);

    return () => {
      clearTimeout(init);
      if (catRafRef.current)     cancelAnimationFrame(catRafRef.current);
      if (catResumeTimer.current) clearTimeout(catResumeTimer.current);
    };
  }, [extendedCategories.length]);

  /* Tap-target ref — stores href of item pressed */
  const catClickHref = useRef<string | null>(null);

  /* Pointer events */
  const onCatPointerDown = (e: React.PointerEvent) => {
    catPhaseRef.current = "dragging";
    const el = (e.target as Element).closest("[data-cat-href]");
    catClickHref.current = el?.getAttribute("data-cat-href") ?? null;
    if (catResumeTimer.current) clearTimeout(catResumeTimer.current);
    catDragRef.current = { startX: e.clientX, startPos: catPosRef.current, lastX: e.clientX, lastT: performance.now() };
    catVelRef.current  = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onCatPointerMove = (e: React.PointerEvent) => {
    if (!catDragRef.current || catPhaseRef.current !== "dragging") return;
    const now = performance.now();
    const dt  = now - catDragRef.current.lastT;
    const dx  = e.clientX - catDragRef.current.lastX;
    if (dt > 0) catVelRef.current = (dx / dt) * (1000 / 60);
    catDragRef.current.lastX = e.clientX;
    catDragRef.current.lastT = now;
    catPosRef.current = catNorm(catDragRef.current.startPos + (e.clientX - catDragRef.current.startX), catOneSetRef.current);
  };

  const onCatPointerUp = (e: React.PointerEvent) => {
    if (!catDragRef.current) return;
    const totalDx = Math.abs(e.clientX - catDragRef.current.startX);
    const href = catClickHref.current;
    catDragRef.current = null;
    catClickHref.current = null;

    /* Tap (barely moved) → navigate */
    if (totalDx < 6 && href) {
      navigate(href);
      catPhaseRef.current = "autoplay";
      return;
    }

    if (Math.abs(catVelRef.current) > CAT_COAST_MIN) {
      catPhaseRef.current = "coasting";
    } else {
      catPhaseRef.current = "paused";
      catScheduleResume();
    }
  };

  const scrollPrev = () => {
    const slideW = (catTrackRef.current?.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 200;
    catVelRef.current  = slideW * 0.18;
    catPhaseRef.current = "coasting";
    catScheduleResume(1200);
  };

  const scrollNext = () => {
    const slideW = (catTrackRef.current?.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 200;
    catVelRef.current  = -slideW * 0.18;
    catPhaseRef.current = "coasting";
    catScheduleResume(1200);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[92vh] w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* Cinematic hero — slow Ken-Burns zoom */}
          <motion.img
            src={HERO_IMG}
            alt="PrivéLux Hero"
            draggable={false}
            loading="eager"
            fetchPriority="high"
            initial={{ scale: 1 }}
            animate={{ scale: 1.07 }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 22%" }}
          />
          {/* Dark overlay — keeps text readable without killing the image */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Gradient fade to site background at the bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
        </div>

        {/* ── Content block — desktop: starts just below blimp; mobile: pushed lower to avoid overlap ── */}
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-start items-center text-center pt-[38vh] md:pt-[33vh] lg:pt-[30vh] lg:translate-x-[2%]">

          {/* Scarface logo — centered between blimp and title */}
          <motion.img
            src={LOGO_CHARACTER}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="eager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.88, y: 0 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.15 }}
            className="h-16 md:h-20 lg:h-24 w-auto object-contain mx-auto mb-4 md:mb-5 select-none pointer-events-none"
          />

          {/* Title + description + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.35 }}
          >
            <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-4 md:mb-5 tracking-tight">
              LA AMBICIÓN SE NOTA.
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto mb-7 md:mb-8 tracking-wide">
              Relojes, accesorios y prendas pensadas para quienes valoran los detalles.
            </p>
            <Link href="/shop">
              <Button
                size="sm"
                className="rounded-none px-7 py-3 text-xs tracking-widest uppercase border border-foreground/70 bg-transparent text-foreground hover:bg-foreground/10 transition-colors duration-300"
              >
                Explorar Catálogo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Category Carousel — uses DB categories, infinite loop */}
      {categories.length > 0 && (
        <section className="pt-8 pb-10 bg-background overflow-hidden">
          <div className="container mx-auto px-4 mb-4">
            <div className="flex justify-between items-end border-b border-border/50 pb-3">
              <div>
                <h2 className="text-lg font-serif font-semibold uppercase tracking-wider">
                  Categorías
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={scrollPrev}
                  data-testid="carousel-prev"
                  className="h-8 w-8 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={scrollNext}
                  data-testid="carousel-next"
                  className="h-8 w-8 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RAF track */}
          <div
            className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
            onPointerDown={onCatPointerDown}
            onPointerMove={onCatPointerMove}
            onPointerUp={onCatPointerUp}
            onPointerCancel={onCatPointerUp}
          >
            <div
              ref={catTrackRef}
              className="flex will-change-transform"
              style={{ transform: "translateX(0px)" }}
            >
              {extendedCategories.map((cat, i) => (
                <Link
                  key={`${cat.slug}-${i}`}
                  href={`/categoria/${cat.slug}`}
                  draggable={false}
                  data-cat-href={`/categoria/${cat.slug}`}
                  style={{ userSelect: "none", WebkitUserDrag: "none", marginRight: "12px" } as React.CSSProperties}
                >
                  <motion.div
                    data-card
                    data-cat-href={`/categoria/${cat.slug}`}
                    data-testid={`category-card-${cat.slug}`}
                    className="relative flex-none w-[43vw] md:w-[22vw] lg:w-[18vw] aspect-[2/3] overflow-hidden cursor-pointer group rounded md:rounded-none shadow-[0_6px_28px_rgba(0,0,0,0.55)] md:shadow-none ring-1 ring-white/[0.07] md:ring-0"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <img
                      src={cloudinaryImage(cat.image)}
                      alt={cat.label}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none"
                      style={{ WebkitUserDrag: "none" } as React.CSSProperties}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/5 to-transparent pointer-events-none" />
                    {/* PL monogram — embossed corner watermark */}
                    <img
                      src={LOGO_PL}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      loading="lazy"
                      className="absolute top-3 right-3 h-5 w-auto object-contain opacity-[0.55] select-none pointer-events-none"
                      style={{ filter: "brightness(0) invert(1)", WebkitUserDrag: "none" } as React.CSSProperties}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                      <p className="font-serif text-base md:text-lg font-medium text-white tracking-wider uppercase">
                        {cat.label}
                      </p>
                      <div className="mt-1 flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-[10px] text-white/70 uppercase tracking-widest">
                          Ver más
                        </span>
                        <ChevronRight className="h-3 w-3 text-white/70" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-10 border-b border-border/50 pb-4 relative">
            <h2 className="text-lg font-serif font-bold uppercase tracking-widest">Destacados</h2>
            {/* PL monogram — subtle watermark in section header */}
            <img
              src={LOGO_PL}
              alt=""
              aria-hidden="true"
              draggable={false}
              loading="lazy"
              className="absolute left-1/2 -translate-x-1/2 bottom-3 h-5 w-auto object-contain opacity-[0.45] select-none pointer-events-none"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <Link href="/shop?featured=true">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none px-5 text-xs tracking-widest uppercase border-foreground/40 hover:border-foreground hover:bg-foreground/10 transition-all duration-300"
              >
                Ver Todo
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {featuredLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-none" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))
            ) : featuredProducts?.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                No hay productos destacados.
              </div>
            ) : (
              <motion.div
                className="col-span-full grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                }}
              >
                {featuredProducts?.slice(0, 8).map((product) => (
                  <motion.div
                    key={product.id}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
                    }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Brand Story Preview */}
      <section className="py-20 bg-card relative overflow-hidden">
        {/* PL background watermark */}
        <img
          src={LOGO_PL}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="lazy"
          className="absolute inset-0 m-auto h-64 w-auto object-contain opacity-[0.07] select-none pointer-events-none"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <div className="container mx-auto px-4 text-center max-w-3xl relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <h2 className="text-sm text-primary uppercase tracking-widest mb-4">Nuestra historia</h2>
            <h3 className="font-serif text-2xl md:text-3xl mb-6">Desde Cero</h3>
            <p className="text-muted-foreground leading-relaxed text-sm mb-4">
              PRIVELUX nació como una idea pequeña y con el tiempo se convirtió en algo real. Cada
              paso, cada producto y cada cliente hacen parte de esta historia.
            </p>
            <p className="text-foreground/60 text-xs uppercase tracking-widest mb-8">
              El éxito no se sueña. Se construye.
            </p>
            <Link href="/about">
              <Button
                variant="ghost"
                className="rounded-none border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary uppercase tracking-widest text-xs px-6 py-2 transition-colors duration-300"
              >
                Leer la historia
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Brands Carousel — "Nuestras Marcas" */}
      <BrandsCarousel />

      {/* Social Proof Section */}
      <section className="py-20 bg-card">
        {/* Title — constrained */}
        <div className="container mx-auto px-4">
          <motion.div
            className="mb-10 border-b border-border/50 pb-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold italic whitespace-nowrap">
              Clientes Privelux
            </h2>
          </motion.div>
        </div>

        {/* Mobile image — 3:4, new photo (hidden md+) */}
        <motion.div
          className="block md:hidden w-full overflow-hidden relative group"
          style={{ aspectRatio: "3/4" }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <img
            src="https://res.cloudinary.com/dpozptqu1/image/upload/v1779996177/ChatGPT_Image_28_may_2026_14_22_42_eei7z6.png"
            alt="Clientes PRIVELUX"
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </motion.div>

        {/* Desktop image — 16:9, original (hidden below md) */}
        <motion.div
          className="hidden md:block w-full aspect-video overflow-hidden relative group"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <img
            src="https://res.cloudinary.com/dpozptqu1/image/upload/v1779993641/ChatGPT_Image_28_may_2026_13_37_31_kzaoa7.png"
            alt="Clientes PRIVELUX"
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </motion.div>

        {/* Caption — constrained */}
        <div className="container mx-auto px-4">
          <motion.p
            className="mt-5 text-sm md:text-base text-primary uppercase tracking-widest text-center font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Más de 300 clientes satisfechos
          </motion.p>
        </div>
      </section>

      {/* Community CTA */}
      <section className="relative overflow-hidden py-28 md:py-36">
        {/* Mobile background (< md) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 block md:hidden pointer-events-none"
          style={{
            backgroundImage:
              "url('https://res.cloudinary.com/dpozptqu1/image/upload/v1779995864/ChatGPT_Image_28_may_2026_14_17_27_bpeja2.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Desktop background (≥ md) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden md:block pointer-events-none"
          style={{
            backgroundImage:
              "url('https://res.cloudinary.com/dpozptqu1/image/upload/v1779995240/ChatGPT_Image_28_may_2026_14_06_48_nviyya.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Dark overlay to keep text readable */}
        <div className="absolute inset-0 bg-black/65 pointer-events-none" />
        {/* Subtle radial glow — gold, very soft */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 60%, hsl(var(--primary)/0.07), transparent 70%)",
          }}
        />
        {/* Thin top rule */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

        <div className="relative container mx-auto px-4 flex flex-col items-center text-center max-w-xl">
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="text-[10px] text-primary uppercase tracking-[0.38em] mb-7"
          >
            Comunidad Privelux
          </motion.p>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mb-6"
          >
            Sé parte de lo que viene.
          </motion.h2>

          {/* Thin gold rule */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.18, ease: "easeOut" }}
            className="h-px w-10 bg-primary mb-7 origin-center"
          />

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.25 }}
            className="text-muted-foreground text-sm md:text-base leading-relaxed mb-10 max-w-sm"
          >
            Accede a nuevos ingresos, mejores precios, dinámicas, contenido
            exclusivo y novedades antes que todos.
          </motion.p>

          {/* Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.33 }}
          >
            <button
              onClick={() =>
                window.open("https://chat.whatsapp.com/GtCLMvKfa13IUFtguDe27n?mode=gi_t", "_blank")
              }
              className="inline-flex items-center gap-3 h-12 px-10 uppercase tracking-[0.22em] text-xs font-medium border border-primary/70 text-primary bg-transparent hover:bg-primary hover:text-primary-foreground transition-all duration-300 focus:outline-none"
            >
              Entrar al grupo
            </button>
          </motion.div>

          {/* Fine print */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-6 text-[11px] text-muted-foreground/50 tracking-wider uppercase"
          >
            Comunidad activa de clientes Privelux.
          </motion.p>
        </div>

        {/* Thin bottom rule */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-t from-transparent via-primary/30 to-transparent" />
      </section>
    </Layout>
  );
}
