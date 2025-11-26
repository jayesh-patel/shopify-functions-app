import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

import type { VariantSummary } from "~/types/variant";

export async function fetchVariantsByIds(admin: AdminApiContext["admin"], ids: string[]): Promise<VariantSummary[]> {
  if (!ids.length) {
    return [];
  }

  const response = await admin.graphql(
    `#graphql
      query VariantNodes($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            sku
            price
            product {
              title
            }
          }
        }
      }
    `,
    {
      variables: { ids },
    }
  );

  const payload = (await response.json()) as {
    data: { nodes: { id: string; title: string; sku?: string | null; price?: string | null; product: { title: string } }[] };
    errors?: { message: string }[];
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return payload.data.nodes
    .filter((node): node is { id: string; title: string; sku?: string | null; price?: string | null; product: { title: string } } => Boolean(node))
    .map((node) => ({
      id: node.id,
      title: node.title,
      sku: node.sku,
      price: node.price,
      productTitle: node.product.title,
    }));
}
