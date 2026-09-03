import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import {
  ShoppingBag,
  Menu,
  X,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Home,
  LayoutGrid,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useListCategories } from "@workspace/api-client-react";

const FAQ_SHORTCUTS = [
  { label: "¿Cuánto tarda el envío?",          index: 0 },
  { label: "¿Manejan Contraentrega?",            index: 2 },
  { label: "¿Cómo funcionan los cambios?",      index: 4 },
  { label: "¿Qué transportadoras utilizan?",   index: 1 },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { items } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const waPanelRef = useRef<HTMLDivElement>(null);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const WHATSAPP_NUMBER = "573024242690";

  useEffect(() => {
    if (!waOpen) return;
    const handler = (e: MouseEvent) => {
      if (waPanelRef.current && !waPanelRef.current.contains(e.target as Node)) {
        setWaOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [waOpen]);

  const { data: dbCategories } = useListCategories();

  /* Build nav links dynamically from DB */
  const categoriesLinks = [
    { href: "/shop", label: "Todas las categorías", slug: undefined },
    ...(dbCategories ?? []).map((c) => ({
      href: `/categoria/${c.slug}`,
      label: c.name,
      slug: c.slug,
    })),
  ];

  const openMobileCategories = () => {
    setMobileCatOpen(true);
    setMobileMenuOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* ─── Top header ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <span className="font-serif text-base tracking-widest font-bold cursor-pointer">
                PRIVELUX
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
              <Link href="/">
                <span
                  className={`transition-colors hover:text-primary cursor-pointer uppercase tracking-wider ${
                    location === "/" ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  INICIO
                </span>
              </Link>
              <Link href="/shop">
                <span
                  className={`transition-colors hover:text-primary cursor-pointer uppercase tracking-wider ${
                    location === "/shop" ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  TIENDA
                </span>
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setCatDropdownOpen(true)}
                onMouseLeave={() => setCatDropdownOpen(false)}
                data-testid="nav-categorias-trigger"
              >
                <div
                  className={`flex items-center cursor-pointer uppercase tracking-wider py-5 -my-5 ${
                    catDropdownOpen || location.startsWith("/categoria")
                      ? "text-primary"
                      : "text-foreground/80"
                  } ${
                    catDropdownOpen
                      ? "border-b-2 border-primary"
                      : "border-b-2 border-transparent"
                  }`}
                >
                  CATEGORÍAS
                  <ChevronDown
                    className={`h-3 w-3 ml-1 transition-transform duration-200 ${
                      catDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <AnimatePresence>
                  {catDropdownOpen && (
                    <motion.div
                      data-testid="nav-dropdown-categorias"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-0 mt-2 min-w-[180px] bg-background border border-border/60 shadow-lg z-50 py-2"
                    >
                      {categoriesLinks.map((link, idx) => (
                        <Link key={link.href} href={link.href}>
                          <span
                            data-testid={
                              link.slug
                                ? `nav-dropdown-item-${link.slug}`
                                : `nav-dropdown-item-all`
                            }
                            className={`block px-4 py-2 text-xs uppercase tracking-wider hover:text-primary transition-colors cursor-pointer ${
                              idx === 0 ? "text-muted-foreground" : "text-foreground"
                            }`}
                            onClick={() => setCatDropdownOpen(false)}
                          >
                            {link.label}
                          </span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/about">
                <span
                  className={`transition-colors hover:text-primary cursor-pointer uppercase tracking-wider ${
                    location === "/about" ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  NOSOTROS
                </span>
              </Link>
              <Link href="/contact">
                <span
                  className={`transition-colors hover:text-primary cursor-pointer uppercase tracking-wider ${
                    location === "/contact" ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  PREGUNTAS
                </span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Cart icon — desktop only */}
            <Link href="/cart" className="hidden md:block">
              <Button variant="ghost" size="icon" className="relative cursor-pointer" data-cart-btn>
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Hamburger — mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Mobile full-screen menu ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="md:hidden fixed inset-0 top-14 z-40 bg-background border-b border-border p-6 overflow-y-auto pb-24"
          >
            <nav className="flex flex-col gap-1">
              <Link href="/">
                <span
                  className={`block py-3 text-base font-medium tracking-wider uppercase border-b border-border/30 ${
                    location === "/" ? "text-primary" : "text-foreground/80"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  INICIO
                </span>
              </Link>
              <Link href="/shop">
                <span
                  className={`block py-3 text-base font-medium tracking-wider uppercase border-b border-border/30 ${
                    location === "/shop" ? "text-primary" : "text-foreground/80"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  TIENDA
                </span>
              </Link>

              {/* Expandable categories */}
              <div className="flex flex-col border-b border-border/30">
                <div
                  data-testid="mobile-nav-categorias"
                  className="flex items-center justify-between py-3 text-base font-medium tracking-wider uppercase text-foreground/80 cursor-pointer"
                  onClick={() => setMobileCatOpen(!mobileCatOpen)}
                >
                  CATEGORÍAS
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-200 ${
                      mobileCatOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <AnimatePresence>
                  {mobileCatOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-3 pb-4 pl-4 border-l border-border/50 ml-2">
                        {categoriesLinks.map((link) => (
                          <Link key={link.href} href={link.href}>
                            <span
                              className="block text-sm uppercase tracking-wider text-muted-foreground hover:text-primary"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {link.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/about">
                <span
                  className={`block py-3 text-base font-medium tracking-wider uppercase border-b border-border/30 ${
                    location === "/about" ? "text-primary" : "text-foreground/80"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  NOSOTROS
                </span>
              </Link>
              <Link href="/contact">
                <span
                  className={`block py-3 text-base font-medium tracking-wider uppercase ${
                    location === "/contact" ? "text-primary" : "text-foreground/80"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  PREGUNTAS
                </span>
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main content ─── */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-background py-12 mb-16 md:mb-0">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-serif text-xl tracking-widest font-bold">PRIVELUX</span>
              <img
                src="https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                loading="lazy"
                className="h-6 w-auto object-contain opacity-[0.45] select-none pointer-events-none"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Relojes, accesorios y prendas con una estética limpia, moderna y auténtica.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-4 uppercase tracking-wider text-sm font-light">
              Accesos rápidos
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/shop">
                  <span className="hover:text-primary cursor-pointer">Ver todo</span>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <span className="hover:text-primary cursor-pointer">Nuestra historia</span>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <span className="hover:text-primary cursor-pointer">Preguntas Frecuentes</span>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4 uppercase tracking-wider text-sm font-light">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-primary cursor-pointer">Términos de servicio</span>
              </li>
              <li>
                <span className="hover:text-primary cursor-pointer">Política de privacidad</span>
              </li>
              <li>
                <span className="hover:text-primary cursor-pointer">Envíos y devoluciones</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PRIVELUX. Todos los derechos reservados.
        </div>
      </footer>

      {/* ─── WhatsApp floating button + FAQ panel ─── */}
      <div ref={waPanelRef} className="fixed bottom-[4.75rem] md:bottom-6 right-5 z-50 flex flex-col items-end gap-2">

        {/* FAQ panel */}
        <AnimatePresence>
          {waOpen && (
            <motion.div
              key="wa-panel"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-72 bg-[#111] border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.7)]"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-medium">Preguntas frecuentes</p>
                <button
                  onClick={() => setWaOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* FAQ shortcuts */}
              <div className="py-1">
                {FAQ_SHORTCUTS.map(({ label, index }) => (
                  <button
                    key={index}
                    className="w-full text-left"
                    onClick={() => {
                      setWaOpen(false);
                      if (location === "/contact") {
                        window.location.hash = `#faq-${index}`;
                      } else {
                        navigate(`/contact#faq-${index}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer group">
                      <span className="text-primary text-[8px]">◆</span>
                      <span className="text-xs text-foreground/75 group-hover:text-foreground transition-colors leading-snug">
                        {label}
                      </span>
                      <ChevronRight className="h-3 w-3 ml-auto shrink-0 text-white/20 group-hover:text-primary/50 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer CTA */}
              <div className="px-4 pb-4 pt-3 border-t border-white/8">
                <p className="text-[10px] text-muted-foreground/70 mb-2.5 leading-relaxed">
                  ¿No encontraste tu respuesta?
                </p>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWaOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-medium py-2.5 px-4 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Contactar por WhatsApp
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating trigger button — same design as before */}
        <button
          onClick={() => setWaOpen((v) => !v)}
          className="h-11 w-11 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          aria-label="Ayuda y preguntas frecuentes"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      {/* ─── Mobile bottom navigation bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/97 backdrop-blur-md border-t border-border/40">
        <div className="flex items-center justify-around h-16 px-1">
          <Link href="/">
            <div
              className={`flex flex-col items-center gap-[3px] px-3 py-2 cursor-pointer transition-colors ${
                location === "/" ? "text-primary" : "text-foreground/40"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-5 w-5" strokeWidth={location === "/" ? 2 : 1.5} />
              <span className="text-[9px] uppercase tracking-widest font-medium">Inicio</span>
            </div>
          </Link>

          <Link href="/shop">
            <div
              className={`flex flex-col items-center gap-[3px] px-3 py-2 cursor-pointer transition-colors ${
                location === "/shop" ? "text-primary" : "text-foreground/40"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={location === "/shop" ? 2 : 1.5} />
              <span className="text-[9px] uppercase tracking-widest font-medium">Tienda</span>
            </div>
          </Link>

          <div
            className={`flex flex-col items-center gap-[3px] px-3 py-2 cursor-pointer transition-colors ${
              location.startsWith("/categoria") ? "text-primary" : "text-foreground/40"
            }`}
            onClick={openMobileCategories}
          >
            <LayoutGrid
              className="h-5 w-5"
              strokeWidth={location.startsWith("/categoria") ? 2 : 1.5}
            />
            <span className="text-[9px] uppercase tracking-widest font-medium">Categorías</span>
          </div>

          <Link href="/cart">
            <div
              className={`relative flex flex-col items-center gap-[3px] px-3 py-2 cursor-pointer transition-colors ${
                location === "/cart" ? "text-primary" : "text-foreground/40"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingCart
                className="h-5 w-5"
                strokeWidth={location === "/cart" ? 2 : 1.5}
              />
              {cartCount > 0 && (
                <span className="absolute top-1 right-2 h-[14px] min-w-[14px] px-[3px] rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
              <span className="text-[9px] uppercase tracking-widest font-medium">Carrito</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
