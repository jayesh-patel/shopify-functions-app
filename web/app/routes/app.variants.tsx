import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

import { authenticate } from "~/shopify.server";
import type { VariantSummary } from "~/types/variant";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  const response = await admin.graphql(
    `#graphql
      query VariantSearch($query: String!, $first: Int!) {
        productVariants(first: $first, query: $query) {
          nodes {
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
      variables: {
        query: query || "",
        first: 25,
      },
    }
  );

  const payload = (await response.json()) as {
    data: {
      productVariants: { nodes: { id: string; title: string; sku?: string | null; price?: string | null; product: { title: string } }[] };
    };
    errors?: { message: string }[];
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const variants: VariantSummary[] = payload.data.productVariants.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    sku: node.sku,
    price: node.price,
    productTitle: node.product.title,
  }));

  return json({ variants });
}
