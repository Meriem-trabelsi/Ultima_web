import { Component, ErrorInfo, ReactNode, lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

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
  const shouldRenderScene = ["/", "/about-us"].includes(location.pathname);

  useEffect(() => {
    const onPointerOutUi = (event: MouseEvent) => {
      const ui = closestFromEventTarget<HTMLElement>(event.target, "button, a, [role='button']");
      if (!ui) return;
      ui.classList.remove("ui-physical");
    };

    document.addEventListener("mouseout", onPointerOutUi);

    return () => {
      document.removeEventListener("mouseout", onPointerOutUi);
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
      {shouldRenderScene && (
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <ThreeSceneBackground />
          </Suspense>
        </SceneErrorBoundary>
      )}
      <Navbar />
      <main className="app-content-3d flex-1 pt-16" key={location.pathname}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
