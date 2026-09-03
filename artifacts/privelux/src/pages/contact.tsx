import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Plus, Minus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_PL =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png";

interface FAQItem {
  q: string;
  answer: string;
  bullets?: string[];
  details?: { label: string; text: string }[];
  footer?: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Cuánto tarda el envío?",
    answer:
      "Los pedidos realizados temprano normalmente se despachan el mismo día. Pedidos realizados en horarios más tarde pueden ser despachados al siguiente día hábil.",
    details: [
      {
        label: "Ciudades principales",
        text: "2 a 3 días hábiles aproximadamente.",
      },
      {
        label: "Municipios y zonas más alejadas",
        text: "3 a 5 días hábiles aproximadamente dependiendo de la transportadora y ubicación.",
      },
    ],
  },
  {
    q: "¿Qué transportadoras manejan?",
    answer: "Trabajamos principalmente con:",
    bullets: ["Interrapidísimo", "Coordinadora", "Envía"],
    footer:
      "Seleccionamos la mejor opción dependiendo de la ciudad y tiempos de entrega.",
  },
  {
    q: "¿Manejan pago contra entrega?",
    answer:
      "Sí. Manejamos pago contra entrega en gran parte del país.",
    footer:
      "Para pedidos contra entrega solicitamos únicamente el valor del envío por adelantado para garantizar la gestión y despacho seguro del pedido.",
  },
  {
    q: "¿Qué métodos de pago manejan?",
    answer: "Aceptamos:",
    bullets: [
      "Transferencias",
      "Pago contra entrega",
      "Otros métodos coordinados directamente por WhatsApp",
    ],
  },
  {
    q: "¿Los productos tienen garantía?",
    answer:
      "Realizamos cambios por defectos de fábrica reportados oportunamente después de recibir el producto.",
    footer: "No aplica garantía por daños ocasionados por mal uso.",
  },
  {
    q: "¿Realizan domicilios en Pereira y Dosquebradas?",
    answer:
      "Sí. En Pereira, Dosquebradas y zonas cercanas manejamos domicilios rápidos, normalmente el mismo día o al siguiente dependiendo del horario del pedido.",
  },
  {
    q: "¿Manejan ventas al por mayor?",
    answer:
      "Sí. También manejamos pedidos al por mayor en referencias seleccionadas.",
    bullets: [
      "A partir de 6 unidades del mismo tipo de producto puedes acceder a precios especiales para negocio, reventa o grupos.",
    ],
    footer:
      "Para más información sobre disponibilidad y valores mayoristas, contáctanos directamente por WhatsApp.",
  },
];

function FAQAccordion({ item, index, isOpen, onToggle }: {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
      className={`border-b border-border/40 transition-colors duration-300 ${
        isOpen ? "border-border/70" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-5 py-7 text-left group focus:outline-none"
        aria-expanded={isOpen}
      >
        {/* Number */}
        <span
          className={`text-[11px] font-mono mt-[3px] flex-none transition-colors duration-300 ${
            isOpen ? "text-primary" : "text-primary/30"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Question */}
        <span
          className={`flex-1 font-serif text-base md:text-lg leading-snug transition-colors duration-300 ${
            isOpen ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
          }`}
        >
          {item.q}
        </span>

        {/* Icon */}
        <span
          className={`flex-none mt-1 transition-colors duration-300 ${
            isOpen ? "text-primary" : "text-foreground/30 group-hover:text-foreground/60"
          }`}
        >
          {isOpen ? (
            <Minus className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* Answer */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pl-10 pb-8 pr-8 space-y-4">
              {/* Left gold accent bar */}
              <div className="relative pl-5 border-l border-primary/30">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.answer}
                </p>

                {item.details && (
                  <div className="mt-4 space-y-3">
                    {item.details.map((d, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-primary/50 mt-[5px] flex-none">
                          <svg width="4" height="4" viewBox="0 0 4 4" fill="currentColor">
                            <circle cx="2" cy="2" r="2" />
                          </svg>
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="text-foreground/70 font-medium">{d.label}:</span>{" "}
                          {d.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {item.bullets && (
                  <ul className="mt-4 space-y-2">
                    {item.bullets.map((b, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="h-[1px] w-4 bg-primary/40 flex-none" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                {item.footer && (
                  <p className="mt-4 text-sm text-muted-foreground/70 italic leading-relaxed">
                    {item.footer}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Contact() {
  const [openIndex, setOpenIndex] = useState<number | null>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const m = hash.match(/^#faq-(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const WHATSAPP_NUMBER = "573024242690";

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  // Scroll to and open the FAQ item indicated by URL hash (mount + hash changes)
  const scrollToFaq = (hash: string) => {
    const m = hash.match(/^#faq-(\d+)$/);
    if (!m) return;
    const idx = parseInt(m[1], 10);
    // Scroll immediately so the user sees the item before it opens
    itemRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Open accordion
    setOpenIndex(idx);
    // Scroll again after the accordion animation settles (~350 ms) to re-center
    const t = setTimeout(() => {
      itemRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 380);
    return t;
  };

  useEffect(() => {
    const t = scrollToFaq(window.location.hash);
    return () => { if (t !== undefined) clearTimeout(t); };
  }, []);

  useEffect(() => {
    const onHashChange = () => scrollToFaq(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <Layout>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06),_transparent_60%)]" />
        {/* PL background watermark */}
        <img
          src={LOGO_PL}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="eager"
          className="absolute inset-0 m-auto h-40 w-auto object-contain opacity-[0.06] select-none pointer-events-none"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <div className="container mx-auto px-4 py-20 lg:py-28 text-center relative">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[10px] text-primary uppercase tracking-[0.35em] mb-5"
          >
            F.A.Q
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-serif text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6"
          >
            Preguntas Frecuentes
          </motion.h1>
          {/* Thin gold rule */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="mx-auto h-[1px] w-16 bg-primary origin-center mb-6"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed"
          >
            Todo lo que necesitas saber sobre pedidos, envíos y garantías.
          </motion.p>
        </div>
      </section>

      {/* Accordion list */}
      <section className="container mx-auto px-4 py-16 lg:py-24 max-w-2xl">
        <div className="border-t border-border/40">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} ref={(el) => { itemRefs.current[i] = el; }}>
              <FAQAccordion
                item={item}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="border-t border-border/30 bg-card">
        <div className="container mx-auto px-4 py-16 lg:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[10px] text-primary uppercase tracking-[0.3em] mb-4">
              ¿Tienes otra pregunta?
            </p>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-3">
              Estamos para ayudarte
            </h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Escríbenos directamente por WhatsApp y te respondemos de inmediato.
            </p>
            <Button
              className="h-12 px-8 rounded-none uppercase tracking-widest text-xs border border-primary/60 bg-transparent text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              onClick={() =>
                window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank")
              }
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Hablar por WhatsApp
            </Button>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
