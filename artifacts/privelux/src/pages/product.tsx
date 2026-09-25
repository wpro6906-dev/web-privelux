import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout";
import { formatPrice, cloudinaryImage, effectivePrice } from "@/lib/format";
import { SIZE_TEMPLATES } from "@/lib/size-templates";
import { MarkdownDescription } from "@/components/markdown-description";
import { useGetProduct, useListRelatedProducts, getGetProductQueryKey, getListRelatedProductsQueryKey, useCreatePurchaseRequest } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, ShoppingBag, MessageCircle, ChevronLeft, ChevronRight, X, ZoomIn, Truck, AlertTriangle, ShoppingCart, User, Phone, Mail, Loader2, CheckCircle2, Sparkles, MapPin, Package, Share2, Check, Copy } from "lucide-react";
import { ColombiaLocationPicker } from "@/components/colombia-location-picker";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_PL =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png";

/* ── Fly-to-cart animation ─────────────────────────────────────────────── */
function FlyToCartParticle({ from, onDone }: { from: DOMRect; onDone: () => void }) {
  const cartEl =
    document.querySelector<HTMLElement>("[data-cart-btn]") ??
    document.querySelector<HTMLElement>("[data-cart-mobile]");

  if (!cartEl) { onDone(); return null; }

  const to = cartEl.getBoundingClientRect();

  const sx = from.left + from.width / 2 - 12;
  const sy = from.top + from.height / 2 - 12;
  const ex = to.left + to.width / 2 - 12;
  const ey = to.top + to.height / 2 - 12;

  const dx = ex - sx;
  const dy = ey - sy;
  const arcX = dx * 0.15 + (dx > 0 ? -50 : 50);
  const arcY = Math.min(-100, dy * 0.3 - 60);

  return createPortal(
    <motion.div
      style={{ position: "fixed", left: sx, top: sy, zIndex: 9999, pointerEvents: "none" }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{
        x: [0, arcX, dx],
        y: [0, arcY, dy],
        scale: [1, 1.4, 0.15],
        opacity: [1, 1, 0],
      }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], times: [0, 0.38, 1] }}
      onAnimationComplete={onDone}
    >
      <ShoppingBag className="h-6 w-6 text-primary drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
    </motion.div>,
    document.body,
  );
}

/* ── Full-screen image lightbox ──────────────────────────────────────────── */
function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  /* ── Touch state (mobile pinch-to-zoom, double-tap, swipe, pan) ── */
  const containerRef      = useRef<HTMLDivElement>(null);
  const pinchStartDist    = useRef<number | null>(null);
  const pinchStartScale   = useRef<number>(1);
  const touchSwipeStartX  = useRef<number | null>(null);
  const touchPanOrigin    = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTapMs         = useRef<number>(0);
  /* Live refs — so event listeners always see current state without re-attaching */
  const scaleRef     = useRef(scale);
  const translateRef = useRef(translate);
  const currentRef   = useRef(current);
  const imagesLen    = useRef(images.length);
  useEffect(() => { scaleRef.current     = scale;          }, [scale]);
  useEffect(() => { translateRef.current = translate;      }, [translate]);
  useEffect(() => { currentRef.current   = current;        }, [current]);
  useEffect(() => { imagesLen.current    = images.length;  }, [images.length]);

  const resetZoom = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };
  const goTo = (idx: number) => { setCurrent(idx); resetZoom(); };
  const prev = () => goTo((current - 1 + images.length) % images.length);
  const next = () => goTo((current + 1) % images.length);

  /* Keyboard + scroll lock */
  useEffect(() => {
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = saved; };
  }, [current, images.length]);

  /* Non-passive touch listeners — pinch-to-zoom, double-tap, swipe, pan */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function touchDist(t: TouchList): number {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onStart(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2) {
        pinchStartDist.current  = touchDist(e.touches);
        pinchStartScale.current = scaleRef.current;
        touchSwipeStartX.current = null;
        touchPanOrigin.current   = null;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        touchSwipeStartX.current = t.clientX;
        touchPanOrigin.current   = { x: t.clientX, y: t.clientY, tx: translateRef.current.x, ty: translateRef.current.y };
        /* Double-tap → toggle zoom */
        const now = Date.now();
        if (now - lastTapMs.current < 300) {
          if (scaleRef.current > 1) { setScale(1); setTranslate({ x: 0, y: 0 }); }
          else { setScale(2.5); }
          lastTapMs.current = 0;
        } else { lastTapMs.current = now; }
      }
    }

    function onMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        const d  = touchDist(e.touches);
        const ns = Math.max(1, Math.min(4, pinchStartScale.current * (d / pinchStartDist.current)));
        setScale(ns);
        if (ns <= 1) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && scaleRef.current > 1 && touchPanOrigin.current) {
        const t = e.touches[0];
        setTranslate({
          x: touchPanOrigin.current.tx + t.clientX - touchPanOrigin.current.x,
          y: touchPanOrigin.current.ty + t.clientY - touchPanOrigin.current.y,
        });
      }
    }

    function onEnd(e: TouchEvent) {
      /* Swipe navigation — only when image is at 1× */
      if (e.touches.length === 0 && scaleRef.current <= 1 && touchSwipeStartX.current !== null && e.changedTouches.length === 1) {
        const diff = touchSwipeStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          const len = imagesLen.current;
          const cur = currentRef.current;
          setCurrent(diff > 0 ? (cur + 1) % len : (cur - 1 + len) % len);
          setScale(1); setTranslate({ x: 0, y: 0 });
        }
      }
      if (e.touches.length < 2) pinchStartDist.current = null;
      if (e.touches.length === 0) { touchSwipeStartX.current = null; touchPanOrigin.current = null; }
    }

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, []); // empty deps: all live state accessed via refs

  /* Wheel zoom (desktop) */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.max(1, Math.min(4, scale + (e.deltaY < 0 ? 0.25 : -0.25)));
    setScale(next);
    if (next <= 1) setTranslate({ x: 0, y: 0 });
  };

  /* Double-click toggle zoom (desktop) */
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) { resetZoom(); } else { setScale(2.5); }
  };

  /* Mouse pan when zoomed (desktop) */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    setTranslate({ x: panStart.current.tx + e.clientX - panStart.current.x, y: panStart.current.ty + e.clientY - panStart.current.y });
  };
  const handleMouseUp = () => { setIsPanning(false); panStart.current = null; };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/96 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 pointer-events-none">
        <span className="text-[11px] text-white/40 uppercase tracking-widest">
          {images.length > 1 ? `${current + 1} / ${images.length}` : "Vista ampliada"}
        </span>
        <div className="flex items-center gap-3 pointer-events-auto">
          {scale > 1 && (
            <button onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors px-2 py-1">
              Restablecer zoom
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="h-9 w-9 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Cerrar">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Image — touch events attached via non-passive listeners in useEffect */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center"
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          touchAction: "none",
          cursor: scale > 1 ? (isPanning ? "grabbing" : "grab") : "zoom-in",
        }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={images[current]}
          alt={`Imagen ${current + 1}`}
          draggable={false}
          className="select-none"
          style={{
            maxWidth: "92vw",
            maxHeight: "84vh",
            objectFit: "contain",
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: isPanning ? "none" : "transform 0.2s ease",
            userSelect: "none",
          }}
        />
        {scale === 1 && (
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/30 uppercase tracking-widest pointer-events-none text-center px-4">
            <span className="hidden md:inline">Doble clic o rueda para zoom</span>
            <span className="md:hidden">Pellizca para zoom · Doble toque para ampliar</span>
          </p>
        )}
      </div>

      {/* Side arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-white/8 hover:bg-white/18 flex items-center justify-center transition-colors border border-white/10"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-white/8 hover:bg-white/18 flex items-center justify-center transition-colors border border-white/10"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-12 h-16 overflow-hidden border transition-all ${
                i === current ? "border-white opacity-100" : "border-white/20 opacity-40 hover:opacity-75"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

function ImageGallery({ images, onImageClick }: { images: string[]; onImageClick: (idx: number) => void }) {
  const [current, setCurrent] = useState(0);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);

  const pauseAndResume = () => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 3000);
  };

  const hoverPause = () => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      if (!pausedRef.current) setCurrent((i) => (i + 1) % images.length);
    }, 4000);
    return () => {
      clearInterval(id);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [images.length]);

  const prev = () => { setCurrent((i) => (i - 1 + images.length) % images.length); pauseAndResume(); };
  const next = () => { setCurrent((i) => (i + 1) % images.length); pauseAndResume(); };
  const goTo = (idx: number) => { setCurrent(idx); pauseAndResume(); };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pauseAndResume();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    } else if (Math.abs(diff) < 10) {
      onImageClick(current);
    }
    touchStartX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    mouseStartX.current = e.clientX;
    hoverPause();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const diff = mouseStartX.current - e.clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    } else if (Math.abs(diff) < 8) {
      onImageClick(current);
    }
    mouseStartX.current = null;
    pauseAndResume();
  };

  const handleMouseLeave = () => {
    mouseStartX.current = null;
    pauseAndResume();
  };

  return (
    <>
      <div
        title="Clic para ampliar"
        className="relative aspect-[3/4] bg-muted overflow-hidden select-none cursor-zoom-in"
        onMouseEnter={hoverPause}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* PL monogram — embossed corner watermark on product image */}
        <img
          src={LOGO_PL}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="lazy"
          className="absolute top-3 right-3 z-20 h-6 w-auto object-contain opacity-[0.55] select-none pointer-events-none"
          style={{ filter: "brightness(0) invert(1)" }}
        />

        {/* Images — crossfade */}
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={`Imagen ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              i === current ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          />
        ))}

        {/* Controls — only if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-4 w-4 text-white" />
            </button>

            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); goTo(i); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  aria-label={`Ver imagen ${i + 1}`}
                  className={`h-[2px] rounded-none transition-all duration-300 ${
                    i === current ? "w-7 bg-white" : "w-2.5 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>

            <div className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-sm px-2 py-1">
              <span className="text-[10px] text-white/80 font-medium">
                {current + 1} / {images.length}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip — inside gallery so it can control current */}
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={`flex-none w-16 h-20 overflow-hidden transition-all border ${
                i === current
                  ? "opacity-100 border-primary/60"
                  : "opacity-50 border-transparent hover:opacity-90 hover:border-white/20"
              }`}
            >
              <img src={img} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── AI Image Notice Modal ───────────────────────────────────────────────── */
function AiImageModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = saved; };
  }, []);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-md bg-[#0e0e0e] border border-white/10 p-7 shadow-2xl"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-8 flex items-center justify-center bg-sky-500/10 border border-sky-500/20">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div>
              <p className="text-[9px] text-sky-400/70 uppercase tracking-widest mb-0.5">Transparencia</p>
              <h3 className="text-sm font-serif font-semibold tracking-wide text-white">
                Información de imagen
              </h3>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />

          {/* Body */}
          <div className="space-y-3.5 text-[12px] leading-relaxed text-white/65">
            <p>
              Algunas imágenes de este producto han sido <span className="text-white/90 font-medium">optimizadas o recreadas mediante inteligencia artificial</span> para ofrecer una mejor visualización.
            </p>
            <p>
              Las imágenes están basadas completamente en <span className="text-white/90 font-medium">fotografías reales del mismo producto</span> y buscan representar con precisión sus detalles, colores y características.
            </p>
            <p>
              El producto recibido corresponde al <span className="text-white/90 font-medium">artículo real mostrado en las fotografías de referencia</span>.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={onClose}
              className="w-full py-2.5 text-[10px] uppercase tracking-widest text-white/50 hover:text-white border border-white/10 hover:border-white/30 transition-all duration-200"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export function ProductPage() {
  const params = useParams();
  const id = Number(params.id);
  const { addToCart, items: cartItems } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [unavailableSizeNotice, setUnavailableSizeNotice] = useState<string | null>(null);
  const unavailableSizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [flyFrom, setFlyFrom] = useState<DOMRect | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");
  const addToCartBtnRef = useRef<HTMLButtonElement>(null);

  const { data: product, isLoading, error } = useGetProduct(id, {
    query: {
      enabled: !!id && !isNaN(id),
      queryKey: getGetProductQueryKey(id),
    },
  });

  const { data: relatedProducts, isLoading: relatedLoading } = useListRelatedProducts(id, {
    query: {
      enabled: !!id && !isNaN(id),
      queryKey: getListRelatedProductsQueryKey(id),
    },
  });

  const stockLimit = product?.stock && product.stock > 0 ? product.stock : null;
  const alreadyInCart = cartItems.find((i) => i.product.id === product?.id)?.quantity ?? 0;

  const showStockError = (msg: string) => {
    // Each call gets a unique ID so Sonner always renders a fresh toast
    toast.error(msg, { id: `stock-${Date.now()}`, duration: 4000 });
  };

  const handleSizeSelect = (size: string, available: boolean) => {
    if (unavailableSizeTimeoutRef.current) {
      clearTimeout(unavailableSizeTimeoutRef.current);
      unavailableSizeTimeoutRef.current = null;
    }

    if (!available) {
      setUnavailableSizeNotice(size);
      unavailableSizeTimeoutRef.current = setTimeout(() => {
        setUnavailableSizeNotice(null);
        unavailableSizeTimeoutRef.current = null;
      }, 2600);
      return;
    }

    setUnavailableSizeNotice(null);
    setSelectedSize(size);
  };

  useEffect(() => {
    return () => {
      if (unavailableSizeTimeoutRef.current) {
        clearTimeout(unavailableSizeTimeoutRef.current);
      }
    };
  }, []);

  const handleAddToCart = () => {
    if (!product) return;
    if (product.hasSizes && !selectedSize) {
      toast.error("Por favor selecciona una talla antes de continuar.");
      return;
    }
    if (stockLimit !== null && alreadyInCart + quantity > stockLimit) {
      const remaining = stockLimit - alreadyInCart;
      if (remaining <= 0) {
        showStockError(`Ya tienes las ${stockLimit} unidades disponibles en tu carrito.`);
      } else {
        showStockError(
          alreadyInCart > 0
            ? `Ya tienes ${alreadyInCart} en el carrito. Solo puedes agregar ${remaining === 1 ? "1 unidad más." : `${remaining} unidades más.`}`
            : `Solo hay ${stockLimit} unidades disponibles de este producto.`,
        );
      }
      return;
    }
    addToCart(product, quantity, selectedSize || undefined);
    const rect = addToCartBtnRef.current?.getBoundingClientRect();
    if (rect) setFlyFrom(rect);
    toast.success("Agregado al carrito", {
      description: `${quantity}x ${product.name}`,
    });
  };

  const WHATSAPP_NUMBER = "573024242690";
  const waEncode = (text: string) =>
    Array.from(text)
      .map((c) => (c.codePointAt(0)! > 127 ? c : encodeURIComponent(c)))
      .join("");
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buyName, setBuyName] = useState("");
  const [buyPhone, setBuyPhone] = useState("");
  const [buyEmail, setBuyEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // COD modal state
  const [codModalOpen, setCodModalOpen] = useState(false);
  const [codName, setCodName] = useState("");
  const [codPhone, setCodPhone] = useState("");
  const [codEmail, setCodEmail] = useState("");
  const [codDepartment, setCodDepartment] = useState("");
  const [codCity, setCodCity] = useState("");
  const [codAddress, setCodAddress] = useState("");
  const [codNeighborhood, setCodNeighborhood] = useState("");
  const [codReference, setCodReference] = useState("");
  const [codConfirmed, setCodConfirmed] = useState(false);

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = window.location.href;
    const apiBase = import.meta.env.VITE_API_URL ?? "";

    // Fire-and-forget share tracking
    fetch(`${apiBase}/api/products/${product.id}/share`, { method: "POST" }).catch(() => {});

    const shareData = {
      title: product.name,
      text: product.description?.replace(/#+\s*/g, "").slice(0, 100) ?? `Mira este producto en PRIVELUX`,
      url: shareUrl,
    };

    if (typeof navigator.share === "function" && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        setShareState("shared");
        setTimeout(() => setShareState("idle"), 3000);
      } catch {
        // User cancelled — no error
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        toast.success("¡Enlace copiado!", { description: "Pégalo en WhatsApp, Instagram o donde quieras." });
        setTimeout(() => setShareState("idle"), 3000);
      } catch {
        toast.error("No se pudo copiar el enlace.");
      }
    }
  };

  const createRequest = useCreatePurchaseRequest({
    mutation: {
      onSuccess: () => {
        setConfirmed(true);
        const price = effectivePrice(product!);
        const SEP = "------------------------------";
        let message = `Hola, equipo de PRIVELUX.\n\n`;
        message += `Me gustar\u00EDa recibir informaci\u00F3n sobre la siguiente solicitud:\n\n`;
        message += `\u25C6 PRODUCTOS SELECCIONADOS\n\n`;
        message += `\u25BA ${product!.name} \u00D7 ${quantity} \u2014 $${formatPrice(price * quantity)}\n`;
        if (selectedSize)          message += `   Talla: ${selectedSize}\n`;
        if (product!.brandName)    message += `   Marca: ${product!.brandName}\n`;
        if (product!.categoryName) message += `   Categor\u00EDa: ${product!.categoryName}\n`;
        message += `\n${SEP}\n\n`;
        message += `\u25A0 TOTAL ESTIMADO: $${formatPrice(price * quantity)}\n\n`;
        message += `${SEP}\n\n`;
        message += `\u25C6 DATOS DE CONTACTO\n\n`;
        message += `Nombre: ${buyName}\n`;
        message += `Tel\u00E9fono: ${buyPhone}\n`;
        if (buyEmail.trim()) message += `Correo: ${buyEmail.trim()}\n`;
        message += `\nQuedo atento a la disponibilidad, formas de pago y opciones de env\u00EDo.\n\nMuchas gracias.`;
        setTimeout(() => {
          window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waEncode(message)}`;
          setBuyModalOpen(false);
          setConfirmed(false);
          setBuyName(""); setBuyPhone(""); setBuyEmail("");
        }, 3000);
      },
      onError: () => toast.error("Error al registrar la solicitud. Intenta de nuevo."),
    },
  });

  const createCodRequest = useCreatePurchaseRequest({
    mutation: {
      onSuccess: () => {
        setCodConfirmed(true);
        setTimeout(() => {
          setCodModalOpen(false);
          setCodConfirmed(false);
          setCodName(""); setCodPhone(""); setCodEmail("");
          setCodDepartment(""); setCodCity(""); setCodAddress(""); setCodNeighborhood(""); setCodReference("");
        }, 6000);
      },
      onError: () => toast.error("Error al registrar el pedido. Intenta de nuevo."),
    },
  });

  const handleWhatsAppBuy = () => {
    if (!product) return;
    if (product.hasSizes && !selectedSize) {
      toast.error("Por favor selecciona una talla antes de continuar.");
      return;
    }
    setBuyModalOpen(true);
  };

  const handleCodBuy = () => {
    if (!product) return;
    if (product.hasSizes && !selectedSize) {
      toast.error("Por favor selecciona una talla antes de continuar.");
      return;
    }
    setCodModalOpen(true);
  };

  const handleBuySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyName.trim() || !buyPhone.trim()) {
      toast.error("Nombre y teléfono son obligatorios.");
      return;
    }
    createRequest.mutate({
      data: {
        name: buyName.trim(),
        phone: buyPhone.trim(),
        email: buyEmail.trim() || undefined,
        purchaseMethod: "whatsapp",
        items: [{
          productId: product!.id,
          name: product!.name,
          image: product!.image,
          price: effectivePrice(product!),
          quantity,
          ...(selectedSize ? { size: selectedSize } : {}),
        }],
        total: String(effectivePrice(product!) * quantity),
      },
    });
  };

  const handleCodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codName.trim() || !codPhone.trim() || !codDepartment || !codCity || !codAddress.trim()) {
      toast.error("Nombre, teléfono, departamento, ciudad y dirección son obligatorios.");
      return;
    }
    createCodRequest.mutate({
      data: {
        name: codName.trim(),
        phone: codPhone.trim(),
        email: codEmail.trim() || undefined,
        city: `${codCity}, ${codDepartment}`,
        address: codAddress.trim(),
        neighborhood: codNeighborhood.trim() || undefined,
        addressRef: codReference.trim() || undefined,
        purchaseMethod: "contra_entrega",
        items: [{
          productId: product!.id,
          name: product!.name,
          image: product!.image,
          price: effectivePrice(product!),
          quantity,
          ...(selectedSize ? { size: selectedSize } : {}),
        }],
        total: String(effectivePrice(product!) * quantity),
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="space-y-6">
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-serif mb-4">Producto no encontrado</h1>
          <p className="text-muted-foreground mb-8">El producto que buscas no existe o fue eliminado.</p>
        </div>
      </Layout>
    );
  }

  const galleryImages = [product.image, ...(product.imageUrls ?? [])]
    .filter(Boolean)
    .map(cloudinaryImage) as string[];

  const ogTitle = `${product.name} — PRIVELUX`;
  const ogDescription = product.description?.replace(/#+\s*/g, "").slice(0, 200) ?? "Accesorios y ropa premium con estética moderna.";
  const rawOgImage = (product.imageUrls?.[0]) || product.image || "";
  const ogImage = rawOgImage.includes("cloudinary.com") && rawOgImage.includes("/upload/")
    ? rawOgImage.replace("/upload/", "/upload/w_1200,h_630,c_fill,q_80,f_jpg/")
    : cloudinaryImage(rawOgImage);
  const ogUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Layout>
      <Helmet>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="PRIVELUX" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        {ogUrl && <meta property="og:url" content={ogUrl} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Helmet>
      {flyFrom && (
        <FlyToCartParticle from={flyFrom} onDone={() => setFlyFrom(null)} />
      )}
      {aiModalOpen && <AiImageModal onClose={() => setAiModalOpen(false)} />}
      <div className="container mx-auto px-4 py-12 lg:py-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
          {/* Image gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ImageGallery
              images={galleryImages}
              onImageClick={(idx) => { setLightboxIndex(idx); setLightboxOpen(true); }}
            />

            {/* AI image notice badge — only shown when enabled for this product */}
            {(product as any).aiImageNotice && (
              <button
                onClick={() => setAiModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-sky-400/60 hover:text-sky-400 uppercase tracking-widest transition-colors duration-200 group"
              >
                <Sparkles className="h-3 w-3 group-hover:scale-110 transition-transform duration-200" />
                Imagen optimizada con IA
              </button>
            )}
          </motion.div>

          {/* Product info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sticky top-24"
          >
            <div className="text-xs text-primary uppercase tracking-widest mb-4">
              {product.categoryName} {product.brandName && `• ${product.brandName}`}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold mb-4 leading-tight">{product.name}</h1>
            <div className="mb-4">
              <motion.button
                type="button"
                onClick={handleShare}
                whileTap={{ scale: 0.96 }}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest border transition-all duration-300 ${
                  shareState !== "idle"
                    ? "border-primary/60 text-primary bg-primary/8"
                    : "border-white/20 text-foreground/70 hover:border-white/40 hover:text-foreground"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {shareState === "copied" ? (
                    <motion.span key="copied" className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}>
                      <Copy className="h-3.5 w-3.5" /> Enlace copiado
                    </motion.span>
                  ) : shareState === "shared" ? (
                    <motion.span key="shared" className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}>
                      <Check className="h-3.5 w-3.5" /> ¡Compartido!
                    </motion.span>
                  ) : (
                    <motion.span key="idle" className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}>
                      <Share2 className="h-3.5 w-3.5" /> Compartir
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            {product.isOnSale && product.originalPrice && product.salePrice ? (
              <div className="mb-5 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-base text-muted-foreground/60 line-through">
                    ${formatPrice(Number(product.originalPrice))}
                  </span>
                  <span className="text-[11px] font-bold tracking-widest uppercase px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    -{Math.round((1 - Number(product.salePrice) / Number(product.originalPrice)) * 100)}%
                  </span>
                </div>
                <motion.div
                  className="text-[28px] font-semibold text-amber-400"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ${formatPrice(Number(product.salePrice))}
                </motion.div>
                <div className="text-xs text-emerald-400/80 font-medium">
                  Ahorras ${formatPrice(Number(product.originalPrice) - Number(product.salePrice))}
                </div>
              </div>
            ) : (
              <div className="text-[23px] font-medium mb-5 text-foreground/90">${formatPrice(Number(product.price))}</div>
            )}

            {/* Size selector — only for products with sizes enabled */}
            {product.hasSizes && product.sizeTemplate && SIZE_TEMPLATES[product.sizeTemplate] && (
              <div className="mb-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/75">
                    Selecciona una talla
                  </p>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/45">
                    Tachada = agotada
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {SIZE_TEMPLATES[product.sizeTemplate].map((size) => {
                    const available = (product.availableSizes ?? []).includes(size);
                    const selected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-disabled={!available}
                        aria-label={available ? `Seleccionar talla ${size}` : `Talla ${size} agotada`}
                        title={available ? `Talla ${size}` : `Talla ${size} agotada`}
                        onClick={() => handleSizeSelect(size, available)}
                        className={`relative min-w-[46px] px-3.5 py-2.5 text-xs font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          !available
                            ? "border-white/10 text-foreground/30 bg-white/[0.015] cursor-not-allowed hover:border-red-400/30 hover:text-foreground/40"
                            : selected
                            ? "border-primary text-primary bg-primary/10 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]"
                            : "border-white/25 text-foreground/90 hover:border-primary/70 hover:text-primary hover:bg-primary/[0.04] cursor-pointer"
                        }`}
                      >
                        <span className="relative z-10">{size}</span>
                        {!available && (
                          <span
                            aria-hidden="true"
                            className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 -rotate-[14deg] bg-red-400/70"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence initial={false} mode="wait">
                  {unavailableSizeNotice && (
                    <motion.div
                      key={unavailableSizeNotice}
                      role="status"
                      aria-live="polite"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="mt-3 inline-flex items-center gap-2 border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[11px] text-red-300/90"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>La talla {unavailableSizeNotice} está agotada por el momento.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedSize && (
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mt-2.5">
                    Talla seleccionada: <span className="text-primary font-semibold">{selectedSize}</span>
                  </p>
                )}
              </div>
            )}

            {/* Low-stock urgency badge — only when < 5 units */}
            {stockLimit !== null && stockLimit < 5 && (
              <div className="flex items-center gap-2 mb-6 px-3 py-2 border-l-2 border-red-500/70 bg-red-500/5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-widest text-red-400">
                  ¡Solo {stockLimit} {stockLimit === 1 ? "unidad disponible" : "unidades disponibles"}!
                </span>
              </div>
            )}

            <div className="mb-10">
              <MarkdownDescription text={product.description} />
            </div>

            {/* Shipping info */}
            <div className="mb-8 py-4 border-t border-b border-white/6 flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 text-sm text-foreground/75">
                <Truck className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span>Pídelo hoy y recíbelo en aproximadamente <span className="font-medium text-foreground/90">3 días hábiles</span>.</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 pl-6 leading-relaxed uppercase tracking-wide">
                Tiempo estimado para ciudades principales. Puede variar según la ubicación.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="text-xs font-medium uppercase tracking-wider w-24">Cantidad</div>
                <div className="flex items-center border border-border h-12 w-32">
                  <button
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 text-center font-medium">{quantity}</div>
                  <button
                    className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={() => setQuantity((q) => {
                      const maxCanAdd = stockLimit !== null ? Math.max(0, stockLimit - alreadyInCart) : Infinity;
                      return Math.min(maxCanAdd, q + 1);
                    })}
                    disabled={stockLimit !== null && quantity >= Math.max(0, stockLimit - alreadyInCart)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {stockLimit !== null && (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {stockLimit === 1 ? "1 unidad disponible" : `${stockLimit} disponibles`}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-4 pt-6 border-t border-border/50">
                {/* Cart-full notice — shown when user already has the max in cart */}
                {stockLimit !== null && alreadyInCart >= stockLimit && (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 border border-white/8 bg-white/[0.03] text-xs text-muted-foreground">
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/50" />
                    <span>
                      Ya tienes{" "}
                      <span className="text-foreground/80 font-medium">
                        {alreadyInCart === 1 ? "la unidad disponible" : `las ${alreadyInCart} unidades disponibles`}
                      </span>{" "}
                      de este producto en tu carrito.
                    </span>
                  </div>
                )}
                <Button
                  ref={addToCartBtnRef}
                  className="w-full h-11 rounded-none text-xs tracking-widest uppercase bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
                  onClick={handleAddToCart}
                  disabled={stockLimit !== null && alreadyInCart >= stockLimit}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" /> Agregar al Carrito
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-11 rounded-none text-xs tracking-widest uppercase border border-primary/60 text-primary hover:bg-primary/10 hover:border-primary transition-colors"
                  onClick={handleWhatsAppBuy}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Comprar por WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-none text-xs tracking-widest uppercase border border-white/20 text-foreground/80 hover:bg-white/5 hover:border-white/40 transition-colors"
                  onClick={handleCodBuy}
                >
                  <Package className="mr-2 h-4 w-4" /> Comprar contra entrega
                </Button>

              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {relatedProducts && relatedProducts.length > 0 && !relatedLoading && (
        <div className="border-t border-border bg-card py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-lg font-serif font-bold uppercase tracking-widest mb-10 text-center">
              También te puede interesar
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <ImageLightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Buy Contra Entrega Modal */}
      <AnimatePresence>
        {codModalOpen && (
          <>
            <motion.div
              key="cod-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black"
              onClick={() => !createCodRequest.isPending && !codConfirmed && setCodModalOpen(false)}
            />
            <motion.div
              key="cod-modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-sm bg-[#111] border border-white/10 p-6 max-h-[90vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                  {codConfirmed ? (
                    <motion.div
                      key="cod-confirmed"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-6 text-center space-y-4"
                    >
                      <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                      <div className="space-y-2">
                        <p className="font-serif text-base uppercase tracking-widest text-emerald-400">
                          ¡Pedido recibido con éxito!
                        </p>
                        <p className="text-sm text-foreground font-medium">Gracias por tu compra.</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                          En los próximos minutos nos comunicaremos contigo para informarte el valor del envío correspondiente a tu ciudad.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Una vez recibamos el pago del envío prepararemos y despacharemos tu pedido para que el producto sea pagado contra entrega.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="cod-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="font-serif text-base uppercase tracking-widest">Compra contra entrega</h2>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Paga el producto al recibirlo</p>
                        </div>
                        <button
                          onClick={() => !createCodRequest.isPending && setCodModalOpen(false)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Info box */}
                      <div className="bg-primary/5 border border-primary/20 p-3.5 mb-4 space-y-1.5">
                        <p className="text-[10px] text-primary uppercase tracking-widest font-semibold mb-2">
                          Información importante sobre el pago contra entrega
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          • El producto se paga al momento de recibirlo.
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          • El valor del envío debe pagarse por anticipado antes del despacho.
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          • Una vez recibamos tu pedido nos comunicaremos contigo para informarte el valor del envío.
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          • Después de recibir el pago del envío prepararemos y despacharemos tu pedido.
                        </p>
                      </div>

                      {/* Product summary */}
                      {product && (
                        <div className="bg-white/[0.03] border border-white/5 p-3 mb-4 flex items-center gap-3">
                          <div className="w-10 h-14 shrink-0 bg-muted overflow-hidden">
                            <img src={cloudinaryImage(product.image)} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground">Cantidad: {quantity}</p>
                          </div>
                          <p className="text-xs font-medium text-primary shrink-0">
                            ${formatPrice(effectivePrice(product) * quantity)}
                          </p>
                        </div>
                      )}

                      {/* Form */}
                      <form onSubmit={handleCodSubmit} className="space-y-2.5">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input type="text" placeholder="Nombre completo *" value={codName} onChange={(e) => setCodName(e.target.value)} required autoFocus
                            className="w-full bg-transparent border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input type="tel" placeholder="Teléfono * (solo números)" value={codPhone} onChange={(e) => setCodPhone(e.target.value.replace(/[^\d+\s\-]/g, ""))} required inputMode="numeric"
                            className="w-full bg-transparent border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input type="email" placeholder="Correo electrónico (opcional)" value={codEmail} onChange={(e) => setCodEmail(e.target.value)}
                            className="w-full bg-transparent border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />
                        </div>
                        <ColombiaLocationPicker
                          department={codDepartment}
                          city={codCity}
                          onDepartmentChange={setCodDepartment}
                          onCityChange={setCodCity}
                        />
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input type="text" placeholder="Dirección completa *" value={codAddress} onChange={(e) => setCodAddress(e.target.value)} required
                            className="w-full bg-transparent border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />
                        </div>
                        <input type="text" placeholder="Barrio (opcional)" value={codNeighborhood} onChange={(e) => setCodNeighborhood(e.target.value)}
                          className="w-full bg-transparent border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />
                        <input type="text" placeholder="Referencia o punto de entrega (opcional)" value={codReference} onChange={(e) => setCodReference(e.target.value)}
                          className="w-full bg-transparent border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50" />

                        <button type="submit" disabled={createCodRequest.isPending}
                          className="w-full mt-1 h-11 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                          {createCodRequest.isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Registrando pedido...</>
                          ) : (
                            <><Package className="h-4 w-4" /> Confirmar pedido</>
                          )}
                        </button>
                      </form>

                      <p className="text-[10px] text-center text-muted-foreground/50 mt-3 leading-relaxed">
                        Nos comunicaremos contigo para coordinar el envío.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Buy via WhatsApp Modal */}
      <AnimatePresence>
        {buyModalOpen && (
          <>
            <motion.div
              key="buy-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black"
              onClick={() => !createRequest.isPending && !confirmed && setBuyModalOpen(false)}
            />
            <motion.div
              key="buy-modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-sm bg-[#111] border border-white/10 p-6">
                <AnimatePresence mode="wait">
                  {confirmed ? (
                    /* ── Confirmation screen ── */
                    <motion.div
                      key="confirmed"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-6 text-center space-y-4"
                    >
                      <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                      <div className="space-y-1.5">
                        <p className="font-serif text-base uppercase tracking-widest text-emerald-400">
                          Solicitud registrada
                        </p>
                        <p className="text-sm text-foreground">
                          Estamos preparando tu solicitud.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                          Serás redirigido a WhatsApp en unos segundos para continuar la atención.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Abriendo WhatsApp...
                      </div>
                    </motion.div>
                  ) : (
                    /* ── Form ── */
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <h2 className="font-serif text-base uppercase tracking-widest">Completa tus datos</h2>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Para continuar por WhatsApp</p>
                        </div>
                        <button
                          onClick={() => !createRequest.isPending && setBuyModalOpen(false)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Product summary */}
                      {product && (
                        <div className="bg-white/[0.03] border border-white/5 p-3 mb-5 flex items-center gap-3">
                          <div className="w-10 h-14 shrink-0 bg-muted overflow-hidden">
                            <img src={cloudinaryImage(product.image)} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground">Cantidad: {quantity}</p>
                          </div>
                          <p className="text-xs font-medium text-primary shrink-0">
                            ${formatPrice(effectivePrice(product) * quantity)}
                          </p>
                        </div>
                      )}

                      {/* Form */}
                      <form onSubmit={handleBuySubmit} className="space-y-3">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Nombre completo *"
                            value={buyName}
                            onChange={(e) => setBuyName(e.target.value)}
                            required
                            autoFocus
                            className="w-full bg-transparent border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="tel"
                            placeholder="Teléfono * (solo números)"
                            value={buyPhone}
                            onChange={(e) => setBuyPhone(e.target.value.replace(/[^\d+\s\-]/g, ""))}
                            required
                            inputMode="numeric"
                            className="w-full bg-transparent border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="email"
                            placeholder="Correo electrónico (opcional)"
                            value={buyEmail}
                            onChange={(e) => setBuyEmail(e.target.value)}
                            className="w-full bg-transparent border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={createRequest.isPending}
                          className="w-full mt-1 h-11 bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                        >
                          {createRequest.isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                          ) : (
                            <><MessageCircle className="h-4 w-4" /> Continuar por WhatsApp</>
                          )}
                        </button>
                      </form>

                      <p className="text-[10px] text-center text-muted-foreground/50 mt-3 leading-relaxed">
                        Tus datos solo se usan para gestionar tu pedido por WhatsApp.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}
