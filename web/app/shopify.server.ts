import { DeliveryMethod } from "@shopify/shopify-api";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

import { prisma } from "~/lib/prisma.server";

const shopify = shopifyApp({
  api: {
    apiVersion: "2024-10",
    restResources,
  },
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  appUrl: process.env.SHOPIFY_APP_URL!,
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SCOPES?.split(",") ?? [],
  hooks: {
    afterAuth: async ({ session }) => {
      console.info(`Authenticated ${session.shop}`);
    },
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },
});

export default shopify;
export const {
  authenticate,
  apiVersion,
} = shopify;
