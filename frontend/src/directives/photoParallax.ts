import type { ObjectDirective } from "vue";

const cleanup = new WeakMap<HTMLElement, () => void>();
// Opt-in on exactly two large photos. No perpetual animation loop.
export const vPhotoParallax: ObjectDirective<HTMLImageElement> = {
  mounted(image) {
    const frame = image.parentElement!;
    const enabled = matchMedia(
      "(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let visible = false,
      raf = 0;
    const update = () => {
      raf = 0;
      const bounds = frame.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)),
      );
      image.style.transform = `translateY(${(progress - 0.5) * 3}%) scale(1.06)`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const sync = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
      raf = 0;
      if (enabled.matches && visible) {
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule, { passive: true });
        schedule();
      } else if (!enabled.matches) image.style.removeProperty("transform");
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting;
        sync();
      },
      { rootMargin: "80px" },
    );
    observer.observe(frame);
    enabled.addEventListener("change", sync);
    cleanup.set(image, () => {
      observer.disconnect();
      enabled.removeEventListener("change", sync);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
      image.style.removeProperty("transform");
    });
  },
  beforeUnmount(image) {
    cleanup.get(image)?.();
    cleanup.delete(image);
  },
};
