import { useEffect, useMemo, useState } from "react";

const INTERACTIVE_SELECTOR = "button, a, [role='button'], input, textarea, select, .gradient-card";

function closestInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest(INTERACTIVE_SELECTOR);
}

const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!coarsePointer && !reducedMotion);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const ball = document.querySelector<HTMLElement>(".cursor-ball");
    const aura = document.querySelector<HTMLElement>(".cursor-aura");
    if (!ball || !aura) return;

    const move = (event: MouseEvent) => {
      tx = event.clientX;
      ty = event.clientY;
    };

    const onOver = (event: MouseEvent) => {
      const interactive = closestInteractive(event.target);
      if (!interactive) return;
      aura.classList.add("cursor-aura-active");
      ball.classList.add("cursor-ball-active");
    };

    const onOut = (event: MouseEvent) => {
      const interactive = closestInteractive(event.target);
      if (!interactive) return;
      aura.classList.remove("cursor-aura-active");
      ball.classList.remove("cursor-ball-active");
    };

    const onClick = () => {
      aura.classList.remove("cursor-click");
      ball.classList.remove("cursor-click");
      requestAnimationFrame(() => {
        aura.classList.add("cursor-click");
        ball.classList.add("cursor-click");
      });
    };

    const animate = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      ball.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      aura.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);
    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    window.addEventListener("click", onClick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("click", onClick);
    };
  }, [enabled]);

  useEffect(() => {
    document.body.classList.toggle("cursor-enabled", enabled);
    return () => {
      document.body.classList.remove("cursor-enabled");
    };
  }, [enabled]);

  const content = useMemo(() => {
    if (!enabled) return null;
    return (
      <>
        <div className="cursor-aura" />
        <div className="cursor-ball" />
      </>
    );
  }, [enabled]);

  return content;
};

export default CustomCursor;
