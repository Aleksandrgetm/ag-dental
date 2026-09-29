import type { ObjectDirective } from "vue";

// This directive is mounted ONLY on content following the tour and interior pages.
// It never observes the Hero or installs scroll/resize handlers.
type MotionState = { scan: () => void; dispose: () => void };
const scopes = new WeakMap<HTMLElement, MotionState>();
export const vEditorialMotion: ObjectDirective<HTMLElement> = {
  mounted(root) {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = matchMedia("(max-width: 760px), (pointer: coarse)");
    const seen = new WeakSet<Element>();
    const active = new Set<Animation>();
    const pending = new Set<HTMLElement>();
    const reveal = (element: HTMLElement) => {
      pending.delete(element);
      observer?.unobserve(element);
      if (
        preference.matches ||
        !element.animate ||
        element.contains(document.activeElement)
      )
        return;
      const masked = element.dataset.reveal === "image";
      const animation = element.animate(
        masked
          ? [
              {
                clipPath: `inset(${compact.matches ? 3 : 8}% 0 0 0)`,
                opacity: 0.5,
              },
              { clipPath: "inset(0% 0 0 0)", opacity: 1 },
            ]
          : [
              {
                transform: `translateY(${compact.matches ? 10 : 22}px)`,
                opacity: 0,
              },
              { transform: "translateY(0)", opacity: 1 },
            ],
        {
          duration: compact.matches ? 450 : masked ? 850 : 650,
          delay: compact.matches
            ? 0
            : Math.min(Number(element.dataset.delay) || 0, 180),
          easing: "cubic-bezier(.22,.68,.24,1)",
          fill: "backwards",
        },
      );
      active.add(animation);
      animation.finished.then(
        () => active.delete(animation),
        () => active.delete(animation),
      );
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) =>
              entries.forEach((entry) => {
                if (entry.isIntersecting) reveal(entry.target as HTMLElement);
              }),
            { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
          )
        : null;
    const scan = () => {
      root
        .querySelectorAll<HTMLElement>(
          "[data-reveal], .page-head h1, .page-head > .lead, .service-row, .journal-row",
        )
        .forEach((element) => {
          if (seen.has(element) || element.closest(".tour")) return;
          seen.add(element);
          if (preference.matches || !observer) return;
          pending.add(element);
          observer.observe(element);
        });
    };
    const reduce = () => {
      if (!preference.matches) return;
      active.forEach((animation) => animation.cancel());
      active.clear();
      pending.forEach((element) => observer?.unobserve(element));
      pending.clear();
    };
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      for (const animation of active) {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        if (target instanceof Element && target.contains(event.target))
          animation.cancel();
      }
    };
    preference.addEventListener("change", reduce);
    root.addEventListener("focusin", focus);
    scan();
    scopes.set(root, {
      scan,
      dispose() {
        observer?.disconnect();
        active.forEach((animation) => animation.cancel());
        preference.removeEventListener("change", reduce);
        root.removeEventListener("focusin", focus);
      },
    });
  },
  updated(root) {
    scopes.get(root)?.scan();
  },
  beforeUnmount(root) {
    scopes.get(root)?.dispose();
    scopes.delete(root);
  },
};
