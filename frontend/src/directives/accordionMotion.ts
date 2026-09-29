import type { ObjectDirective } from "vue";

const disposers = new WeakMap<HTMLDetailsElement, () => void>();

// Native details remains the source of semantics and the no-animation fallback.
export const vAccordionMotion: ObjectDirective<HTMLDetailsElement> = {
  mounted(details) {
    const summary = details.querySelector("summary");
    if (!summary || !details.animate) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    let expanded = details.open;

    const settle = () => {
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
        animation = undefined;
      }
      details.open = expanded;
      details.style.removeProperty("overflow");
      delete details.dataset.collapsing;
    };
    const toggle = (event: MouseEvent) => {
      event.preventDefault();
      const from = details.getBoundingClientRect().height;
      expanded = animation ? !expanded : !details.open;
      settle();
      if (preference.matches) return;

      // Measure only on user interaction; never on scroll or on each frame.
      const to = details.getBoundingClientRect().height;
      details.open = true;
      if (!expanded) details.dataset.collapsing = "";
      details.style.overflow = "clip";
      animation = details.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: 280, easing: "cubic-bezier(.22,.68,.24,1)" },
      );
      animation.onfinish = settle;
    };
    const reduce = () => {
      if (preference.matches) settle();
    };
    summary.addEventListener("click", toggle);
    preference.addEventListener("change", reduce);
    // Settle on wrapping/locale changes rather than retaining a stale pixel height.
    const resize = new ResizeObserver(() => {
      if (animation) settle();
    });
    resize.observe(summary);
    disposers.set(details, () => {
      settle();
      resize.disconnect();
      summary.removeEventListener("click", toggle);
      preference.removeEventListener("change", reduce);
    });
  },
  beforeUnmount(details) {
    disposers.get(details)?.();
    disposers.delete(details);
  },
};
