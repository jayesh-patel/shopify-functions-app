import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";
import enTranslations from "@shopify/polaris/locales/en.json";

import styles from "~/styles/app.css";
import { AppBridgeProvider } from "~/components/providers/AppBridgeProvider";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: styles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    ENV: {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    },
  });
}

export default function App() {
  const { ENV } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <AppBridgeProvider apiKey={ENV.SHOPIFY_API_KEY}>
          <PolarisProvider i18n={enTranslations}>
            <Outlet />
          </PolarisProvider>
        </AppBridgeProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
      </body>
    </html>
  );
}
