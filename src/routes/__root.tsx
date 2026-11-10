import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Palabra — Learn Spanish, free forever" },
      {
        name: "description",
        content:
          "A free, family-friendly Spanish learning game: real lessons, XP, streaks and a friendly tutor. No ads, no subscriptions.",
      },
      { name: "theme-color", content: "#F59E0B" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Palabra" },
    ],
    // Ad review refuses a site with no favicon, so every site starts with one.
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

/** Installs the offline shell in production builds (never in dev, so HMR stays clean). */
function RegisterServiceWorker() {
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // offline install is a bonus, never a blocker
      });
    }
  }, []);
  return null;
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <RegisterServiceWorker />
        <Scripts />
      </body>
    </html>
  );
}
