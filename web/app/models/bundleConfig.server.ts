import type { ShopConfig } from "@prisma/client";

import { prisma } from "~/lib/prisma.server";

export type BundleConfig = ShopConfig;

export async function getBundleConfig(shopDomain: string) {
  return prisma.shopConfig.findUnique({ where: { shopDomain } });
}

interface UpsertPayload {
  shopDomain: string;
  bundleSize: number;
  bundlePrice: number;
  label: string;
  variantIds: string[];
  discountNodeId?: string | null;
}

export async function upsertBundleConfig(payload: UpsertPayload) {
  return prisma.shopConfig.upsert({
    where: { shopDomain: payload.shopDomain },
    update: {
      bundleSize: payload.bundleSize,
      bundlePrice: payload.bundlePrice,
      label: payload.label,
      variantIds: payload.variantIds,
      discountNodeId: payload.discountNodeId ?? undefined,
    },
    create: {
      shopDomain: payload.shopDomain,
      bundleSize: payload.bundleSize,
      bundlePrice: payload.bundlePrice,
      label: payload.label,
      variantIds: payload.variantIds,
      discountNodeId: payload.discountNodeId ?? null,
    },
  });
}

export async function deleteBundleConfig(shopDomain: string) {
  return prisma.shopConfig.delete({ where: { shopDomain } });
}
