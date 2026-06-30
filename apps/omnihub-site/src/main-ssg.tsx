import "./ssg-websocket";
import { ViteReactSSG } from "vite-react-ssg";
import type { RouteObject } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { PrivacyPage } from "./pages/Privacy";
import { TermsPage } from "./pages/Terms";
import { RequestAccessPage } from "./pages/RequestAccess";
import "./i18n";
import "./styles/globals.css";
import "./styles/theme.css";
import "./styles/components.css";
import "./styles/omnidash-layout.css";

// Pre-auth marketing routes only — post-auth /omnidash/* stays CSR
const routes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/privacy", element: <PrivacyPage /> },
  { path: "/terms", element: <TermsPage /> },
  { path: "/request-access", element: <RequestAccessPage /> },
];

export const createRoot = ViteReactSSG({ routes });
