import { Product } from "@workspace/api-client-react";
import { formatPrice, cloudinaryImage } from "@/lib/format";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTOPLAY_MS   = 4_000;
const RESUME_MS     = 3_000;
const STAGGER_SLOTS = 4;
const STAGGER_STEP  = 1_000; // ms between stagger buckets

function ProductCarousel({
  images,
  alt,
  featured,
}: {
  images: string[];
  alt: string;
  featured?: boolean | null;
}) {
  const [current, setCurrent] = useState(0);

  // Tracks which image indices have fully loaded — read by the interval closure,
  // written by onLoad handlers. Using a ref avoids triggering re-renders on load.
  const loadedRef   = useRef<Set<number>>(new Set([0])); // img 0 loads eagerly
  const pausedRef   = useRef(false);
  const visibleRef  = useRef(false); // set by IntersectionObserver
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const wasDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Deterministic stagger: hash first image URL into one of 4 buckets so nearby
  // cards don't all flip at the same moment. Stable across re-renders.
  const staggerMs = useMemo(() => {
    const s = images[0] ?? "";
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return (Math.abs(h) % STAGGER_SLOTS) * STAGGER_STEP;
  }, [images[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preload images 2+ as the card approaches the viewport (400 px margin) ──
  useEffect(() => {
    if (images.length <= 1) return;
    const el = containerRef.current;
    if (!el) return;
    let triggered = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          obs.disconnect();
          images.slice(1).forEach((src) => {
            const img = new window.Image();
            img.src = src;
          });
        }
      },
      { rootMargin: "400px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [images]);

  // ── Pause / resume autoplay based on actual viewport visibility ───────────
  useEffect(() => {
    if (images.length <= 1) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [images.length]);

  // ── Autoplay with staggered start ─────────────────────────────────────────
  // • Skips tick when: manually paused, off-screen, or tab hidden.
  // • Holds on current image if the next one hasn't loaded yet — no black flash.
  // • document.hidden is read inline (live) — no visibilitychange listener needed.
  useEffect(() => {
    if (images.length <= 1) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const initTimer = setTimeout(() => {
      intervalId = setInterval(() => {
        if (pausedRef.current || !visibleRef.current || document.hidden) return;
        setCurrent((prev) => {
          const next = (prev + 1) % images.length;
          return loadedRef.current.has(next) ? next : prev;
        });
      }, AUTOPLAY_MS);
    }, staggerMs);

    return () => {
      clearTimeout(initTimer);
      if (intervalId) clearInterval(intervalId);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [images.length, staggerMs]);

  // ── Interaction helpers ────────────────────────────────────────────────────
  const pauseAndResume = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_MS);
  }, []);

  const hoverPause = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((i) => (i - 1 + images.length) % images.length);
    pauseAndResume();
  };

  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((i) => (i + 1) % images.length);
    pauseAndResume();
  };

  const goTo = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent(idx);
    pauseAndResume();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pauseAndResume();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40)
      setCurrent((i) =>
        diff > 0
          ? (i + 1) % images.length
          : (i - 1 + images.length) % images.length,
      );
    touchStartX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    mouseStartX.current = e.clientX;
    wasDragging.current = false;
    hoverPause();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartX.current !== null && Math.abs(e.clientX - mouseStartX.current) > 8) {
      wasDragging.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const diff = mouseStartX.current - e.clientX;
    if (Math.abs(diff) > 40) {
      setCurrent((i) =>
        diff > 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length,
      );
    }
    mouseStartX.current = null;
    pauseAndResume();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (wasDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDragging.current = false;
    }
  };

  const handleMouseLeave = () => {
    mouseStartX.current = null;
    wasDragging.current = false;
    pauseAndResume();
  };

  return (
    <div
      ref={containerRef}
      className="aspect-[3/4] overflow-hidden bg-muted relative cursor-grab active:cursor-grabbing"
      onMouseEnter={hoverPause}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {images.map((img, i) => (
        <img
          key={i}
          ref={(el) => {
            // Safari: onLoad never fires for images already in cache.
            // Check complete+naturalWidth on mount so loadedRef is seeded correctly.
            if (el && el.complete && el.naturalWidth > 0) {
              loadedRef.current.add(i);
            }
          }}
          src={img}
          alt={i === 0 ? alt : `${alt} ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
          onLoad={() => loadedRef.current.add(i)}
          onError={() => loadedRef.current.add(i)} // unblock autoplay even on error
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        />
      ))}

      {featured && (
        <div className="absolute top-2 left-2 z-20 bg-background/80 text-foreground/70 text-[9px] font-medium px-2 py-0.5 uppercase tracking-widest border border-border/60">
          Destacado
        </div>
      )}

      <button
        onClick={prev}
        aria-label="Imagen anterior"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 bg-black/35 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/65"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-white" />
      </button>
      <button
        onClick={next}
        aria-label="Imagen siguiente"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 bg-black/35 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/65"
      >
        <ChevronRight className="h-3.5 w-3.5 text-white" />
      </button>

      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => goTo(i, e)}
            aria-label={`Imagen ${i + 1}`}
            className={`h-[2px] rounded-none transition-all duration-300 ${
              i === current
                ? "w-5 bg-white"
                : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const allImages = [product.image, ...(product.imageUrls ?? [])]
    .filter(Boolean)
    .map(cloudinaryImage);
  const hasCarousel = allImages.length > 1;

  return (
    <motion.div whileHover={{ opacity: 0.92 }} transition={{ duration: 0.25 }}>
      <Link href={`/product/${product.id}`}>
        <div
          className="group cursor-pointer"
          data-testid={`card-product-${product.id}`}
        >
          {hasCarousel ? (
            <ProductCarousel
              images={allImages}
              alt={product.name}
              featured={product.featured}
            />
          ) : (
            <div className="aspect-[3/4] overflow-hidden bg-muted relative">
              <img
                src={cloudinaryImage(product.image)}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
              />
              {product.featured && (
                <div className="absolute top-2 left-2 bg-background/80 text-foreground/70 text-[9px] font-medium px-2 py-0.5 uppercase tracking-widest border border-border/60">
                  Destacado
                </div>
              )}
            </div>
          )}

          <div className="pt-3 pb-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-medium">
              {product.categoryName || "Sin categoría"}
            </div>
            <h3 className="text-sm text-foreground font-medium leading-snug line-clamp-1">
              {product.name}
            </h3>
            {product.isOnSale && product.originalPrice && product.salePrice ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[13px] text-muted-foreground/60 line-through">
                  ${formatPrice(Number(product.originalPrice))}
                </span>
                <motion.span
                  className="text-base font-semibold text-amber-400"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ${formatPrice(Number(product.salePrice))}
                </motion.span>
                <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  -{Math.round((1 - Number(product.salePrice) / Number(product.originalPrice)) * 100)}%
                </span>
              </div>
            ) : (
              <div className="mt-2 text-base font-medium text-foreground/80">
                ${formatPrice(Number(product.price))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
