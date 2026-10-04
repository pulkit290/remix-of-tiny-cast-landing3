import { useEffect } from "react";

/**
 * Lightweight global scroll effects:
 * - [data-reveal] elements get `.is-visible` once they enter the viewport (CSS does the animation).
 * - [data-parallax="0.2"] elements drift via the `--py` CSS variable, only while on screen.
 * Watches the DOM so elements added by route changes are picked up too.
 */
export function useScrollFx() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" },
    );

    const visible = new Set<HTMLElement>();
    const pio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) visible.add(el); else visible.delete(el);
      }
    });

    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
      if (!reduce) document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        pio.observe(el);
      });
    };
    scan();
    let pending = 0;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; scan(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let frame = 0;
    const onScroll = () => {
      if (reduce || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        visible.forEach((el) => {
          const speed = Number(el.dataset["parallax"]) || 0.15;
          el.style.setProperty("--py", `${Math.round(y * speed)}px`);
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      pio.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      if (pending) cancelAnimationFrame(pending);
    };
  }, []);
}
