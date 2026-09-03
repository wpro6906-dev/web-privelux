import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useRef, useEffect } from "react";

const HERO_DESKTOP =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1780002480/ChatGPT_Image_28_may_2026_16_06_54_uzxgch.png";
const HERO_MOBILE =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1780002607/ChatGPT_Image_28_may_2026_16_09_11_jrfdly.png";
const LOGO_CHARACTER =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985097/Dise%C3%B1o_sin_t%C3%ADtulo_qbcusw.png";
const LOGO_PL =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1779985188/Dise%C3%B1o_sin_t%C3%ADtulo_1_qh6p8c.png";

/* ── Media assets ────────────────────────────────────────────────────────── */
const INICIOS_IMG =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1780004122/Inicio_ml2bgf.jpg";
const INICIOS_VID =
  "https://res.cloudinary.com/dpozptqu1/video/upload/v1780005217/Inicio_rqkxhp.mov";

const CRECIMIENTO_IMG =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1780004123/Intermedio_yfy5lb.jpg";
const CRECIMIENTO_VID =
  "https://res.cloudinary.com/dpozptqu1/video/upload/v1780004610/Intermedio_pyfefo.mov";

const PRESENTE_IMG =
  "https://res.cloudinary.com/dpozptqu1/image/upload/v1780004123/Final_ii8pb3.jpg";
const PRESENTE_VID =
  "https://res.cloudinary.com/dpozptqu1/video/upload/v1780005147/Final_tynvzk.mov";

/* ── Story video — preloaded, autoplay, poster placeholder ──────────────── */
function StoryVideo({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /* f_mp4,vc_auto,q_auto: full file re-encoded to MP4, no trimming */
  const mp4Src = src.replace("/video/upload/", "/video/upload/f_mp4,vc_auto,q_auto/");

  /* Programmatic play — handles browsers that ignore the autoplay attribute */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => {
      video.play().catch(() => {
        /* Autoplay blocked by browser policy — stays paused until interaction */
      });
    };
    if (video.readyState >= 3) {
      tryPlay();
      return;
    }
    video.addEventListener("canplay", tryPlay, { once: true });
    return () => video.removeEventListener("canplay", tryPlay);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-zinc-950 ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        onMouseEnter={(e) => { e.currentTarget.controls = true; }}
        onMouseLeave={(e) => { e.currentTarget.controls = false; }}
        className="w-full h-full object-cover"
      >
        <source src={mp4Src} type="video/mp4" />
        <source src={src} type="video/quicktime" />
      </video>
    </div>
  );
}

/* ── Fade-in wrapper ─────────────────────────────────────────────────────── */
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.85, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function About() {
  return (
    <Layout>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative h-[58vh] w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_MOBILE}
            alt=""
            aria-hidden="true"
            className="md:hidden w-full h-full object-cover object-center"
          />
          <img
            src={HERO_DESKTOP}
            alt=""
            aria-hidden="true"
            className="hidden md:block w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
        </div>

        <motion.img
          src={LOGO_CHARACTER}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="eager"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 0.95, x: 0 }}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
          className="absolute bottom-[22%] md:bottom-0 right-[-6%] md:right-[4%] h-[48%] md:h-[92%] w-auto object-contain select-none pointer-events-none"
        />

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          >
            <p className="text-[10px] text-primary uppercase tracking-widest mb-3">Est. 2020</p>
            <h1 className="font-serif text-3xl md:text-5xl font-semibold uppercase tracking-widest mb-4 leading-tight">
              Nuestra Historia
            </h1>
            <p className="text-base md:text-lg text-muted-foreground font-light tracking-wide">
              Todo empezó con 6 gorras.
            </p>
            <div className="mt-5 w-10 h-[1px] bg-primary/60" />
          </motion.div>
        </div>
      </div>

      {/* ── BLOCK 1: LOS INICIOS ───────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <FadeIn className="mb-8">
          <p className="text-[10px] text-primary uppercase tracking-[0.35em]">01 — Los inicios</p>
        </FadeIn>

        {/* Media grid: image 2/3 + video 1/3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[3px]">
          <FadeIn className="md:col-span-2" delay={0.05}>
            <div className="overflow-hidden h-[55vw] md:h-[420px]">
              <img
                src={INICIOS_IMG}
                alt="Los inicios de PRIVELUX"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <StoryVideo src={INICIOS_VID} poster={INICIOS_IMG} className="h-[55vw] md:h-[420px]" />
          </FadeIn>
        </div>

        <FadeIn className="mt-12 max-w-2xl" delay={0.15}>
          <p className="text-muted-foreground leading-[1.9] text-[15px] mb-6">
            Empecé vendiendo 6 gorras desde el colegio. No había capital, no había experiencia, no
            había local. Solo había producto, convicción y las ganas de construir algo propio.
          </p>
          <p className="text-muted-foreground leading-[1.9] text-[15px]">
            Las primeras ventas fueron entre amigos, compañeros de clase y conocidos del entorno.
            Para muchos era un pasatiempo. Para mí era el comienzo de algo más grande. Desde esas
            primeras transacciones existió una visión clara: que esto no iba a quedarse en 6 gorras.
          </p>
        </FadeIn>
      </section>

      <div className="border-t border-white/[0.05]" />

      {/* ── BLOCK 2: EL CRECIMIENTO ────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">

          {/* Left — text */}
          <div>
            <FadeIn>
              <p className="text-[10px] text-primary uppercase tracking-[0.35em] mb-6">
                02 — El crecimiento
              </p>
              <h2 className="font-serif text-2xl md:text-3xl font-semibold uppercase tracking-wider mb-8 leading-snug">
                Cada ganancia,<br />de vuelta al negocio
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-muted-foreground leading-[1.9] text-[15px] mb-6">
                Cada peso que entró, volvió al negocio. Así funcionó desde el primer día y así sigue
                funcionando. Ganancia reinvertida, inventario ampliado, catálogo creciente.
              </p>
              <p className="text-muted-foreground leading-[1.9] text-[15px] mb-6">
                El camino no fue recto. Hubo pérdidas que dolieron, errores que costaron caro,
                personas equivocadas que se cruzaron en el proceso. Momentos en los que parecía más
                fácil parar que continuar.
              </p>
              <p className="text-muted-foreground leading-[1.9] text-[15px]">
                Pero cada tropiezo enseñó algo. Y cada lección se convirtió en parte de lo que hoy
                somos.
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="mt-10 flex items-center gap-4">
                <div className="w-8 h-[1px] bg-primary/60" />
                <p className="text-[10px] text-primary/60 uppercase tracking-widest">
                  Seguimos. Siempre seguimos.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* Right — video top, image bottom */}
          <div className="flex flex-col gap-[3px]">
            <FadeIn delay={0.1}>
              <StoryVideo src={CRECIMIENTO_VID} poster={CRECIMIENTO_IMG} className="h-[48vw] md:h-[280px]" />
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="overflow-hidden h-[40vw] md:h-[230px]">
                <img
                  src={CRECIMIENTO_IMG}
                  alt="El crecimiento de PRIVELUX"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <div className="border-t border-white/[0.05]" />

      {/* ── BLOCK 3: EL PRESENTE ───────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <FadeIn className="mb-8">
          <p className="text-[10px] text-primary uppercase tracking-[0.35em]">03 — El presente</p>
        </FadeIn>

        {/* Media grid: image left + video right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[3px]">
          <FadeIn delay={0.05}>
            <div className="overflow-hidden h-[55vw] md:h-[400px]">
              <img
                src={PRESENTE_IMG}
                alt="PRIVELUX hoy"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <StoryVideo src={PRESENTE_VID} poster={PRESENTE_IMG} className="h-[55vw] md:h-[400px]" />
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 mt-12">
          <FadeIn delay={0.1}>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold uppercase tracking-wider leading-snug mb-8">
              Una tienda real,<br />construida desde cero
            </h2>
            <p className="text-muted-foreground leading-[1.9] text-[15px] mb-6">
              Hoy PRIVELUX opera desde un espacio propio construido dentro de mi habitación. Una
              tienda física real: inventario organizado, catálogo en línea, comunidad activa. Lo que
              empezó con 6 gorras en una mochila hoy es una marca con identidad, historia y clientes
              que confían en lo que ofrecemos.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-muted-foreground leading-[1.9] text-[15px] mb-6 md:mt-14">
              Todavía existe una meta pendiente: abrir un local comercial propio. No es un sueño —
              es un objetivo concreto que trabajamos día a día. Cada pedido entregado, cada cliente
              satisfecho y cada reinversión nos acerca un poco más a ese punto.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-8 h-[1px] bg-primary/60" />
              <p className="text-[10px] text-primary/60 uppercase tracking-widest">
                En construcción constante
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── QUOTE ─────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-20 md:pb-28">
        <FadeIn>
          <div className="relative border-l-2 border-primary/50 pl-8 py-6 bg-primary/[0.03]">
            {/* Subtle PL corner mark */}
            <img
              src={LOGO_PL}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute top-4 right-4 h-6 w-auto opacity-[0.20] select-none pointer-events-none"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <p className="text-[10px] text-primary uppercase tracking-[0.35em] mb-5">
              PRIVELUX — Nuestra historia
            </p>
            <blockquote className="font-serif text-lg md:text-xl lg:text-2xl text-foreground/90 leading-[1.75] max-w-3xl">
              "Lo que hoy ves no nació de la noche a la mañana. Es el resultado de años de trabajo,
              reinversión constante y la convicción de seguir creciendo paso a paso."
            </blockquote>
          </div>
        </FadeIn>
      </section>

      {/* ── BLOCK 4: HACIA DÓNDE VAMOS ────────────────────────────────── */}
      <section className="relative w-full overflow-hidden bg-zinc-950 border-t border-white/[0.05]">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <img
          src={LOGO_PL}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[70%] w-auto opacity-[0.04] select-none pointer-events-none"
          style={{ filter: "brightness(0) invert(1)" }}
        />

        <div className="relative z-10 container mx-auto px-4 py-28 md:py-36 text-center">
          <FadeIn>
            <p className="text-[10px] text-primary uppercase tracking-[0.35em] mb-8">
              04 — Hacia dónde vamos
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="text-muted-foreground leading-[1.9] text-[15px] max-w-xl mx-auto mb-6">
              Este es solo el comienzo.
            </p>
            <p className="text-muted-foreground leading-[1.9] text-[15px] max-w-xl mx-auto">
              Todavía quedan muchas metas por alcanzar y mucho camino por recorrer. Seguimos
              trabajando para crecer, mejorar y acercarnos cada día más a la visión que dio origen a
              todo esto.
            </p>
          </FadeIn>

          <FadeIn delay={0.25}>
            <div className="mt-20 relative inline-block">
              <div className="flex items-center gap-6 justify-center mb-6">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-primary/60" />
                <div className="w-1.5 h-1.5 bg-primary/60 rotate-45" />
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
              <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl font-semibold uppercase tracking-[0.18em] text-foreground">
                La ambición
              </h2>
              <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl font-semibold uppercase tracking-[0.18em] text-primary">
                se nota.
              </h2>
              <div className="flex items-center gap-6 justify-center mt-6">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-primary/40" />
                <div className="w-1.5 h-1.5 bg-primary/40 rotate-45" />
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-primary/40" />
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.35}>
            <p className="mt-12 text-[10px] text-white/20 uppercase tracking-[0.4em]">
              PRIVELUX — Est. 2020
            </p>
          </FadeIn>
        </div>
      </section>
    </Layout>
  );
}
