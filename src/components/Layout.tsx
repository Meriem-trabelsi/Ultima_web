import { Component, ErrorInfo, ReactNode, lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CustomCursor from "./CustomCursor";

const ThreeSceneBackground = lazy(() => import("./ThreeSceneBackground"));

function closestFromEventTarget<T extends HTMLElement>(target: EventTarget | null, selector: string): T | null {
  if (!(target instanceof Element)) return null;
  return target.closest<T>(selector);
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Intentionally swallow scene errors so UI remains usable.
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    let activeCard: HTMLElement | null = null;
    let activeUi: HTMLElement | null = null;

    const onMove = (event: MouseEvent) => {
      const nextCard = closestFromEventTarget<HTMLElement>(event.target, ".gradient-card");
      const uiTarget = closestFromEventTarget<HTMLElement>(event.target, "button, a, [role='button']");

      if (!nextCard) {
        if (activeCard) {
          activeCard.style.removeProperty("transform");
          activeCard = null;
        }
        return;
      }

      activeCard = nextCard;

      const rect = nextCard.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 8;
      const rotateX = (0.5 - y) * 8;

      nextCard.style.transform = `translateY(-6px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.01)`;

      if (uiTarget) {
        activeUi = uiTarget;
        const uiRect = uiTarget.getBoundingClientRect();
        const ux = (event.clientX - uiRect.left) / uiRect.width - 0.5;
        const uy = (event.clientY - uiRect.top) / uiRect.height - 0.5;
        uiTarget.classList.add("ui-physical");
        uiTarget.style.setProperty("translate", `${(ux * 5).toFixed(1)}px ${(uy * 5).toFixed(1)}px`);
      } else if (activeUi) {
        activeUi.style.removeProperty("translate");
        activeUi.classList.remove("ui-physical");
        activeUi = null;
      }
    };

    const onPointerOut = (event: MouseEvent) => {
      const card = closestFromEventTarget<HTMLElement>(event.target, ".gradient-card");
      if (!card) return;
      card.style.removeProperty("transform");
      if (activeCard === card) activeCard = null;
    };

    const onClick = (event: MouseEvent) => {
      const card = closestFromEventTarget<HTMLElement>(event.target, ".gradient-card");
      if (!card) return;
      card.classList.remove("surface-press");
      requestAnimationFrame(() => card.classList.add("surface-press"));
      window.setTimeout(() => card.classList.remove("surface-press"), 260);

      const ui = closestFromEventTarget<HTMLElement>(event.target, "button, a, [role='button']");
      if (ui) {
        ui.classList.remove("ui-tap");
        requestAnimationFrame(() => ui.classList.add("ui-tap"));
        window.setTimeout(() => ui.classList.remove("ui-tap"), 220);
      }
    };

    const onPointerOutUi = (event: MouseEvent) => {
      const ui = closestFromEventTarget<HTMLElement>(event.target, "button, a, [role='button']");
      if (!ui) return;
      ui.style.removeProperty("translate");
      ui.classList.remove("ui-physical");
      if (activeUi === ui) activeUi = null;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseout", onPointerOut);
    document.addEventListener("mouseout", onPointerOutUi);
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onPointerOut);
      document.removeEventListener("mouseout", onPointerOutUi);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".app-content-3d");
    if (!main) return;
    main.classList.remove("route-cinematic-enter");
    requestAnimationFrame(() => {
      main.classList.add("route-cinematic-enter");
    });
    const id = window.setTimeout(() => {
      main.classList.remove("route-cinematic-enter");
    }, 700);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  return (
    <div className="app-shell-3d min-h-screen flex flex-col">
      <CustomCursor />
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <ThreeSceneBackground />
        </Suspense>
      </SceneErrorBoundary>
      <Navbar />
      <main className="app-content-3d flex-1 pt-16" key={location.pathname}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
