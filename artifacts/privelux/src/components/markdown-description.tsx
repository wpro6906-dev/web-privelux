import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const FALLBACK = "Pieza premium de la colección PRIVELUX.";

/**
 * Pre-processes the raw description string before handing it to ReactMarkdown.
 *
 * Handles two common formats used when typing in the admin textarea:
 *
 * 1. Bullet-separated items on one line:
 *      "Material: algodón • Talla: S, M, L • Color: Negro • Envíos a toda Colombia."
 *    → Converted to individual markdown list items. The last item ending in
 *      punctuation (. ! ?) without ":" is treated as a closing sentence and
 *      placed after the list separated by a blank line.
 *
 * 2. Single-newline-separated items (soft breaks ReactMarkdown collapses):
 *      "Material: algodón\nTalla: S, M, L\nColor: Negro"
 *    → Each non-empty line inside a block that looks like a feature list
 *      (contains ":") is converted to a markdown list item.
 *
 * Lines that already use markdown syntax (-, *, #) pass through unchanged.
 */
function preprocessDescription(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Already a markdown construct — pass through as-is
    if (
      trimmed.startsWith("-") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("#") ||
      trimmed === ""
    ) {
      out.push(line);
      continue;
    }

    // Line contains • separators — explode into list items
    if (trimmed.includes("•")) {
      const parts = trimmed
        .split("•")
        .map((s) => s.trim())
        .filter(Boolean);

      // Last part ending in sentence punctuation without a colon = closing sentence
      const last = parts[parts.length - 1];
      const isClosing = /[.!?]$/.test(last) && !last.includes(":");
      const listParts = isClosing ? parts.slice(0, -1) : parts;
      const closing = isClosing ? last : null;

      for (const item of listParts) {
        out.push(`- ${item}`);
      }
      if (closing) {
        out.push(""); // blank line → new paragraph in ReactMarkdown
        out.push(closing);
      }
      continue;
    }

    // Plain line — pass through
    out.push(line);
  }

  return out.join("\n");
}

const components: Components = {
  p({ children }) {
    return (
      <p className="text-[15px] leading-[1.8] text-foreground/80 mb-5 last:mb-0">
        {children}
      </p>
    );
  },

  h1({ children }) {
    return (
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3 mt-7 first:mt-0">
        {children}
      </h2>
    );
  },

  h2({ children }) {
    return (
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3 mt-7 first:mt-0">
        {children}
      </h3>
    );
  },

  h3({ children }) {
    return (
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/60 mb-2 mt-6 first:mt-0">
        {children}
      </h4>
    );
  },

  ul({ children }) {
    return <ul className="mb-5 space-y-2 last:mb-0">{children}</ul>;
  },

  ol({ children }) {
    return (
      <ol className="mb-5 space-y-2 last:mb-0 counter-reset-[item]">
        {children}
      </ol>
    );
  },

  li({ children }) {
    return (
      <li className="flex items-baseline gap-3 text-[15px] text-foreground/80">
        <span className="shrink-0 text-primary/50 text-[10px] select-none mt-0.5">
          —
        </span>
        <span className="leading-[1.8]">{children}</span>
      </li>
    );
  },

  strong({ children }) {
    return (
      <strong className="font-semibold text-foreground/90 not-italic">
        {children}
      </strong>
    );
  },

  em({ children }) {
    return (
      <em className="not-italic text-foreground/70 font-medium">{children}</em>
    );
  },

  hr() {
    return <hr className="border-white/8 my-6" />;
  },
};

export function MarkdownDescription({ text }: { text?: string | null }) {
  const raw = text?.trim() || FALLBACK;
  const content = preprocessDescription(raw);

  return (
    <div>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
