import { withBasePath } from "@/lib/paths";

export const HOME_FLOW_VIEWS = ["guard", "shadow", "weekly", "reupload", "progress"] as const;
export type HomeFlowView = (typeof HOME_FLOW_VIEWS)[number];

export type HomeRoute = "home" | "feed";

function homeRoutePath(route: HomeRoute): string {
  return route === "feed" ? withBasePath("/feed") : withBasePath("/");
}

export function isHomeFlowView(
  value: string | null | undefined
): value is HomeFlowView {
  return HOME_FLOW_VIEWS.includes(value as HomeFlowView);
}

export function homeFlowPath(view: HomeFlowView, route: HomeRoute = "home"): string {
  const relative = `${homeRoutePath(route)}?view=${view}`;
  if (typeof window !== "undefined") {
    return new URL(relative, window.location.origin).href;
  }
  return `http://localhost:3001${relative}`;
}

export function readHomeUrlState(route: HomeRoute = "home"): {
  view: HomeFlowView | "home";
  tab: "home" | "library";
} {
  if (typeof window === "undefined") {
    return { view: "home", tab: "home" };
  }

  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get("view");

  return {
    view: isHomeFlowView(viewParam) ? viewParam : "home",
    tab: params.get("tab") === "library" ? "library" : "home",
  };
}

export function writeHomeUrlState(
  view: HomeFlowView | "home",
  tab: "home" | "library",
  route: HomeRoute = "home"
): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();
  if (view !== "home") params.set("view", view);
  if (tab === "library") params.set("tab", "library");

  const qs = params.toString();
  const path = homeRoutePath(route) + (qs ? `?${qs}` : "");
  window.history.replaceState(null, "", path);
}
