import { useListFeaturedBrands } from "@workspace/api-client-react";
import { cloudinaryImage } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";

/* ── Tuning ─────────────────────────────────────────────────── */
const AUTOPLAY_SPEED   = 0.45;   // px / frame during autoplay (~27 px/s @ 60 fps)
const FRICTION         = 0.92;   // momentum decay per frame (0.9 = snappy, 0.95 = floaty)
const COAST_THRESHOLD  = 0.15;   // below this velocity → hand off to autoplay
const RESUME_DELAY_MS  = 1800;   // ms after momentum ends before autoplay resumes

export function BrandsCarousel() {
  const { data: brands } = useListFeaturedBrands();
  const [, navigate]     = useLocation();
  const visibleBrands    = brands ?? [];

  /* Triple list so middle copy is always fully visible */
  const items = useMemo(() => {
    if (!visibleBrands.length) return [];
    return [...visibleBrands, ...visibleBrands, ...visibleBrands];
  }, [visibleBrands]);

  /* ── Refs ── */
  const trackRef   = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number | null>(null);
  const posRef     = useRef(0);          // current translateX in px
  const oneSetRef  = useRef(0);          // width of one brand-copy in px

  /* Autoplay / coast state machine */
  type Phase = "autoplay" | "dragging" | "coasting" | "paused";
  const phaseRef    = useRef<Phase>("autoplay");
  const velRef      = useRef(0);         // momentum velocity (px/frame, negative = leftward)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Drag tracking */
  const dragRef    = useRef<{ startX: number; startPos: number; lastX: number; lastT: number } | null>(null);
  const clickHref  = useRef<string | null>(null);

  /* ── Helpers ── */
  function measureOneSet() {
    return trackRef.current ? trackRef.current.scrollWidth / 3 : 0;
  }

  function normalize(p: number, oneSet: number) {
    let n = p;
    while (n < -2 * oneSet) n += oneSet;
    while (n >  0)           n -= oneSet;
    return n;
  }

  function scheduleAutoplay(delayMs = RESUME_DELAY_MS) {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      if (phaseRef.current !== "dragging") phaseRef.current = "autoplay";
    }, delayMs);
  }

  /* ── RAF loop ── */
  useEffect(() => {
    if (!items.length) return;

    function loop() {
      const oneSet = measureOneSet();
      oneSetRef.current = oneSet;

      switch (phaseRef.current) {
        case "autoplay":
          posRef.current -= AUTOPLAY_SPEED;
          break;

        case "coasting": {
          velRef.current *= FRICTION;
          posRef.current += velRef.current;
          if (Math.abs(velRef.current) < COAST_THRESHOLD) {
            phaseRef.current = "paused";
            scheduleAutoplay();
          }
          break;
        }

        /* "dragging" and "paused": posRef is updated externally, no tick needed */
        default:
          break;
      }

      if (oneSet > 0) posRef.current = normalize(posRef.current, oneSet);
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${posRef.current}px)`;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    const init = setTimeout(() => {
      oneSetRef.current = measureOneSet();
      posRef.current    = -oneSetRef.current;   // start showing middle copy
      phaseRef.current  = "autoplay";
      rafRef.current    = requestAnimationFrame(loop);
    }, 80);

    return () => {
      clearTimeout(init);
      if (rafRef.current)     cancelAnimationFrame(rafRef.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [items.length]);

  /* ── Pointer events ── */
  const onPointerDown = (e: React.PointerEvent) => {
    phaseRef.current = "dragging";
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    const el = (e.target as Element).closest("[data-brand-href]");
    clickHref.current = el?.getAttribute("data-brand-href") ?? null;
    dragRef.current = {
      startX: e.clientX,
      startPos: posRef.current,
      lastX: e.clientX,
      lastT: performance.now(),
    };
    velRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || phaseRef.current !== "dragging") return;
    const now   = performance.now();
    const dt    = now - dragRef.current.lastT;
    const dx    = e.clientX - dragRef.current.lastX;

    /* Rolling velocity estimate (px per frame @ 60 fps) */
    if (dt > 0) velRef.current = (dx / dt) * (1000 / 60);

    dragRef.current.lastX = e.clientX;
    dragRef.current.lastT = now;

    const delta = e.clientX - dragRef.current.startX;
    posRef.current = normalize(dragRef.current.startPos + delta, oneSetRef.current);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const totalDx = Math.abs(e.clientX - dragRef.current.startX);
    const href = clickHref.current;
    dragRef.current = null;
    clickHref.current = null;

    /* Tap (barely moved) → navigate */
    if (totalDx < 6 && href) {
      navigate(href);
      phaseRef.current = "autoplay";
      return;
    }

    const speed = Math.abs(velRef.current);
    if (speed > COAST_THRESHOLD) {
      phaseRef.current = "coasting";
    } else {
      phaseRef.current = "paused";
      scheduleAutoplay();
    }
  };

  /* ── Arrow buttons ── */
  const scrollBySlide = (dir: -1 | 1) => {
    if (!oneSetRef.current) return;
    const firstSlide = trackRef.current?.firstElementChild as HTMLElement | null;
    const slideW     = firstSlide ? firstSlide.getBoundingClientRect().width + 12 : 200;
    velRef.current   = dir * -slideW * 0.18; // launch a short coast
    phaseRef.current = "coasting";
    scheduleAutoplay(1200);
  };

  if (!visibleBrands.length) return null;

  return (
    <section className="py-16 bg-card overflow-hidden select-none">
      {/* Header */}
      <div className="container mx-auto px-4 mb-8">
        <div className="flex justify-between items-end border-b border-border/50 pb-4">
          <div>
            <p className="text-[10px] text-primary uppercase tracking-widest mb-1">Colecciones</p>
            <h2 className="text-lg font-serif font-semibold uppercase tracking-wider">
              Nuestras Marcas
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollBySlide(-1)}
              className="h-8 w-8 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollBySlide(1)}
              className="h-8 w-8 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Track */}
      <div
        className="overflow-hidden cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{ transform: "translateX(0px)" }}
        >
          {items.map((brand, i) => {
            const imgSrc = cloudinaryImage(brand.imageUrl);
            return (
              <div
                key={`${brand.id}-${i}`}
                className="relative flex-none w-[43vw] md:w-[22vw] lg:w-[18vw] aspect-[2/3] overflow-hidden group"
                style={{ marginRight: "12px" }}
                data-brand-href={`/shop?brand=${encodeURIComponent(brand.brandName ?? "")}`}
              >
                <img
                  src={imgSrc}
                  alt={brand.brandName}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                  <p className="font-serif text-base md:text-lg font-medium text-white tracking-wider uppercase">
                    {brand.brandName}
                  </p>
                  <div className="mt-1 flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[10px] text-white/70 uppercase tracking-widest">
                      Ver colección
                    </span>
                    <ChevronRight className="h-3 w-3 text-white/70" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
