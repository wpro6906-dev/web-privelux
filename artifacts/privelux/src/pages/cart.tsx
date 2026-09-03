import { Layout } from "@/components/layout";
import { formatPrice, cloudinaryImage, effectivePrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Minus, Plus, X, MessageCircle, User, Phone, Mail, Loader2, CheckCircle2, MapPin, Package, AlertTriangle } from "lucide-react";
import { ColombiaLocationPicker } from "@/components/colombia-location-picker";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useCreatePurchaseRequest } from "@workspace/api-client-react";

const LOGO_PL =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png";

const WHATSAPP_NUMBER = "573024242690";

/**
 * Encode a WhatsApp message for the wa.me ?text= parameter.
 *
 * encodeURIComponent turns emoji into %F0%9F%91%8B (4 percent-encoded UTF-8
 * bytes). WhatsApp's redirect server sometimes decodes those bytes as Latin-1
 * instead of UTF-8, which turns each byte into a separate character and
 * produces the U+FFFD replacement character ("?").
 *
 * Fix: leave every non-ASCII character (emoji, accented letters, etc.) as raw
 * Unicode in the URL string — the browser's HTTP layer will then encode them
 * as UTF-8 automatically, and WhatsApp decodes them correctly.
 * ASCII characters that would break URL parsing (&, =, #, %, space, +) are
 * still percent-encoded individually.
 */
function waEncode(text: string): string {
  return Array.from(text)
    .map((char) => {
      if (char.codePointAt(0)! > 127) return char; // raw Unicode (emoji, ó, etc.)
      return encodeURIComponent(char);              // safe-encode ASCII specials
    })
    .join("");
}

function buildWhatsAppMessage(
  name: string,
  phone: string,
  email: string,
  items: { name: string; quantity: number; price: number; brandName?: string | null; categoryName?: string | null }[],
  total: number
) {
  const SEP = "------------------------------";
  let msg = `Hola, equipo de PRIVELUX.\n\n`;
  msg += `Me gustar\u00EDa recibir informaci\u00F3n sobre la siguiente solicitud:\n\n`;
  msg += `\u25C6 PRODUCTOS SELECCIONADOS\n\n`;
  items.forEach((item, i) => {
    msg += `\u25BA ${item.name} \u00D7 ${item.quantity} \u2014 $${formatPrice(item.price * item.quantity)}\n`;
    if (item.brandName)    msg += `   Marca: ${item.brandName}\n`;
    if (item.categoryName) msg += `   Categor\u00EDa: ${item.categoryName}\n`;
    if (items.length > 1 && i < items.length - 1) msg += `\n${SEP}\n\n`;
  });
  msg += `\n${SEP}\n\n`;
  msg += `\u25A0 TOTAL ESTIMADO: $${formatPrice(total)}\n\n`;
  msg += `${SEP}\n\n`;
  msg += `\u25C6 DATOS DE CONTACTO\n\n`;
  msg += `Nombre: ${name}\n`;
  msg += `Tel\u00E9fono: ${phone}\n`;
  if (email.trim()) msg += `Correo: ${email.trim()}\n`;
  msg += `\nQuedo atento a la disponibilidad, formas de pago y opciones de env\u00EDo.\n\nMuchas gracias.`;
  return msg;
}

export function CartPage() {
  const { items, updateQuantity, removeFromCart, total, clearCart } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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

  const createRequest = useCreatePurchaseRequest({
    mutation: {
      onSuccess: () => {
        const message = buildWhatsAppMessage(name, phone, email, items.map(i => ({
          name: i.product.name,
          quantity: i.quantity,
          price: effectivePrice(i.product),
          brandName: i.product.brandName,
          categoryName: i.product.categoryName,
        })), total);
        setConfirmed(true);
        setTimeout(() => {
          window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waEncode(message)}`;
          clearCart();
          setModalOpen(false);
          setConfirmed(false);
          setName(""); setPhone(""); setEmail("");
        }, 4500);
      },
      onError: () => {
        toast.error("Error al registrar la solicitud. Intenta de nuevo.");
      },
    },
  });

  const createCodRequest = useCreatePurchaseRequest({
    mutation: {
      onSuccess: () => {
        setCodConfirmed(true);
        setTimeout(() => {
          clearCart();
          setCodModalOpen(false);
          setCodConfirmed(false);
          setCodName(""); setCodPhone(""); setCodEmail("");
          setCodDepartment(""); setCodCity(""); setCodAddress(""); setCodNeighborhood(""); setCodReference("");
        }, 6000);
      },
      onError: () => {
        toast.error("Error al registrar el pedido. Intenta de nuevo.");
      },
    },
  });

  const handleOpenModal = () => {
    if (items.length === 0) return;
    setModalOpen(true);
  };

  const handleOpenCodModal = () => {
    if (items.length === 0) return;
    setCodModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Nombre y teléfono son obligatorios.");
      return;
    }
    createRequest.mutate({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        purchaseMethod: "whatsapp",
        items: items.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          image: i.product.image,
          price: effectivePrice(i.product),
          quantity: i.quantity,
          ...(i.size ? { size: i.size } : {}),
        })),
        total: String(total),
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
        items: items.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          image: i.product.image,
          price: effectivePrice(i.product),
          quantity: i.quantity,
          ...(i.size ? { size: i.size } : {}),
        })),
        total: String(total),
      },
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="relative border-b border-border pb-6 mb-10">
          <h1 className="text-2xl font-serif font-bold uppercase tracking-widest">
            Tu Carrito
          </h1>
          <img
            src={LOGO_PL}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="eager"
            className="absolute right-0 top-0 h-8 w-auto object-contain opacity-[0.45] select-none pointer-events-none"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-8 uppercase tracking-wider">Tu carrito está vacío</p>
            <Link href="/shop">
              <Button className="rounded-none px-8 h-12 uppercase tracking-widest">
                Continuar comprando
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              {items.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={item.product.id}
                  className="flex gap-3 sm:gap-6 py-6 border-b border-border/50 relative group"
                >
                  <Link href={`/product/${item.product.id}`}>
                    <div className="w-20 sm:w-32 aspect-[3/4] bg-muted cursor-pointer shrink-0">
                      <img src={cloudinaryImage(item.product.image)} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {item.product.categoryName}
                      </p>
                      <Link href={`/product/${item.product.id}`}>
                        <h3 className="font-serif text-base sm:text-lg font-medium hover:text-primary cursor-pointer transition-colors line-clamp-2 leading-snug">
                          {item.product.name}
                        </h3>
                      </Link>
                      {item.size && (
                        <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                          Talla: <span className="text-foreground/80 font-medium">{item.size}</span>
                        </p>
                      )}
                      <p className="font-medium mt-1 text-sm sm:text-base">${formatPrice(effectivePrice(item.product))}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center border border-border h-9 w-24 sm:w-28">
                        <button
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <div className="flex-1 text-center text-sm font-medium">{item.quantity}</div>
                        <button
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          disabled={!!(item.product.stock && item.product.stock > 0 && item.quantity >= item.product.stock)}
                          onClick={() => {
                            const limit = item.product.stock && item.product.stock > 0 ? item.product.stock : null;
                            if (limit !== null && item.quantity >= limit) {
                              toast.error(
                                `Ya tienes las ${limit} unidades disponibles en tu carrito.`,
                                { id: `stock-cart-${Date.now()}`, duration: 4000 },
                              );
                              return;
                            }
                            updateQuantity(item.product.id, item.quantity + 1, item.size);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.size)}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-destructive flex items-center transition-colors uppercase tracking-wider"
                      >
                        <X className="h-3 w-3 mr-1" /> Eliminar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card border border-border p-6 sticky top-24">
                <h2 className="font-serif text-xl mb-6 uppercase tracking-widest border-b border-border pb-4">Resumen del pedido</h2>
                <div className="space-y-4 mb-6 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Envío</span>
                    <span>A calcular según ciudad</span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-border flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span className="text-primary">${formatPrice(total)}</span>
                  </div>
                </div>
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                >
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-none text-sm tracking-widest uppercase border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-colors"
                    onClick={handleOpenCodModal}
                  >
                    <Package className="mr-2 h-4 w-4" /> Comprar ahora contra entrega
                  </Button>
                </motion.div>
                <div className="pt-1">
                  <Button
                    className="w-full h-11 rounded-none text-sm tracking-widest uppercase bg-green-500 hover:bg-green-600 text-white"
                    onClick={handleOpenModal}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Finalizar por WhatsApp
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Paga al recibir · Envío se coordina por anticipado.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COD Modal */}
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
                      <div className="mb-4 border border-white/10 overflow-hidden">
                        {/* Header */}
                        <div className="bg-white/[0.04] px-3.5 py-2.5 border-b border-white/8 flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-[10px] text-primary uppercase tracking-widest font-semibold">
                            Información importante — Contra entrega
                          </p>
                        </div>

                        {/* Regular bullets */}
                        <div className="px-3.5 pt-3 pb-2.5 space-y-1.5">
                          <p className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                            <span className="text-white/20 shrink-0">•</span>
                            <span>El producto se paga al momento de recibirlo.</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                            <span className="text-white/20 shrink-0">•</span>
                            <span>El valor del envío debe pagarse por anticipado antes del despacho.</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                            <span className="text-white/20 shrink-0">•</span>
                            <span>Una vez recibamos tu pedido nos comunicaremos para informarte el valor del envío.</span>
                          </p>
                        </div>

                        {/* Critical line — highlighted */}
                        <motion.div
                          className="mx-3 mb-3 flex items-start gap-2.5 bg-amber-500/[0.08] border border-amber-500/30 px-3 py-2.5"
                          style={{ borderLeftWidth: "2px", borderLeftColor: "#f59e0b" }}
                          animate={{ borderLeftColor: ["#f59e0b", "#fbbf24", "#f59e0b"] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-300/90 leading-relaxed font-medium">
                            Tu pedido se preparará y despachará{" "}
                            <span className="text-amber-300 font-semibold underline decoration-amber-400/50 underline-offset-2">
                              solo después
                            </span>{" "}
                            de recibir el pago del envío.
                          </p>
                        </motion.div>
                      </div>

                      {/* Order summary */}
                      <div className="bg-white/[0.03] border border-white/5 p-3 mb-4 space-y-1">
                        {items.map((i) => (
                          <div key={i.product.id} className="flex justify-between text-xs text-muted-foreground">
                            <span className="line-clamp-1 flex-1 mr-2">{i.product.name} x{i.quantity}</span>
                            <span className="shrink-0">${formatPrice(effectivePrice(i.product) * i.quantity)}</span>
                          </div>
                        ))}
                        <div className="pt-2 mt-1 border-t border-white/5 flex justify-between text-xs font-medium">
                          <span>Total estimado</span>
                          <span className="text-primary">${formatPrice(total)}</span>
                        </div>
                      </div>

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

      {/* Checkout Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black"
              onClick={() => !createRequest.isPending && !confirmed && setModalOpen(false)}
            />
            <motion.div
              key="modal"
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
                          onClick={() => !createRequest.isPending && setModalOpen(false)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Order summary (compact) */}
                      <div className="bg-white/[0.03] border border-white/5 p-3 mb-5 space-y-1">
                        {items.map((i) => (
                          <div key={i.product.id} className="flex justify-between text-xs text-muted-foreground">
                            <span className="line-clamp-1 flex-1 mr-2">{i.product.name} x{i.quantity}</span>
                            <span className="shrink-0">${formatPrice(Number(i.product.price) * i.quantity)}</span>
                          </div>
                        ))}
                        <div className="pt-2 mt-1 border-t border-white/5 flex justify-between text-xs font-medium">
                          <span>Total estimado</span>
                          <span className="text-primary">${formatPrice(total)}</span>
                        </div>
                      </div>

                      {/* Form */}
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Nombre completo *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
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
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s\-]/g, ""))}
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
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
