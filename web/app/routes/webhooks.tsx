import type { ActionFunctionArgs } from "@remix-run/node";

import shopify from "~/shopify.server";
import { deleteBundleConfig } from "~/models/bundleConfig.server";

export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop } = await shopify.authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      try {
        await deleteBundleConfig(shop);
      } catch (error) {
        console.warn(`Failed to delete config for ${shop}:`, error);
      }
      break;
    default:
      console.info(`Unhandled webhook topic: ${topic}`);
  }

  return new Response(null, { status: 200 });
}
