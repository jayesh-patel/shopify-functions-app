import { AppBridgeProvider as ShopifyAppBridgeProvider } from "@shopify/app-bridge-react";
import type { PropsWithChildren } from "react";
import { useLocation } from "@remix-run/react";

interface Props extends PropsWithChildren {
  apiKey?: string | null;
}

export function AppBridgeProvider({ apiKey, children }: Props) {
  const location = useLocation();
  const host = new URLSearchParams(location.search).get("host");

  if (!apiKey || !host) {
    return <>{children}</>;
  }

  return (
    <ShopifyAppBridgeProvider config={{ apiKey, host, forceRedirect: true }}>
      {children}
    </ShopifyAppBridgeProvider>
  );
}
