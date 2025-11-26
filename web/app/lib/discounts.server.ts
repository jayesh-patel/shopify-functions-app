import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

const METAFIELD_NAMESPACE = "x_for_y_discount";
const METAFIELD_KEY = "configuration";

interface DiscountConfiguration {
  bundleSize: number;
  bundlePrice: number;
  label: string;
  variantIds: string[];
}

interface CreateDiscountResult {
  id: string;
  discountId: string;
  title: string;
}

interface UpdateDiscountResult extends CreateDiscountResult {}

async function adminRequest<T>(admin: AdminApiContext["admin"], query: string, variables?: Record<string, unknown>) {
  const response = await admin.graphql(query, { variables });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify GraphQL request failed: ${body}`);
  }
  return (await response.json()) as T;
}

const FUNCTION_TITLE = "X for Y Discount Function";

export async function getFunctionId(admin: AdminApiContext["admin"]) {
  const data = await adminRequest<{ app: { functions: { nodes: { id: string; title: string; apiType: string }[] } } }>(
    admin,
    `#graphql
      query Functions {
        app {
          functions(first: 50) {
            nodes {
              id
              title
              apiType
            }
          }
        }
      }
    `
  );

  const functionNode = data.app.functions.nodes.find(
    (node) => node.title === FUNCTION_TITLE || (node.apiType === "PRODUCT_DISCOUNT" && node.title?.includes("X for Y"))
  );

  if (!functionNode) {
    throw new Error("Could not find the X for Y discount function. Make sure it is deployed.");
  }

  return functionNode.id;
}

function buildMetafieldValue(config: DiscountConfiguration) {
  return JSON.stringify({
    bundleQuantity: config.bundleSize,
    bundlePrice: config.bundlePrice,
    label: config.label,
    variantIds: config.variantIds,
  });
}

export async function createDiscount(
  admin: AdminApiContext["admin"],
  functionId: string,
  config: DiscountConfiguration
): Promise<CreateDiscountResult> {
  const variables = {
    automaticAppDiscount: {
      title: config.label,
      functionId,
      startsAt: new Date().toISOString(),
      combinesWith: {
        productDiscounts: true,
        orderDiscounts: true,
        shippingDiscounts: true,
      },
      metafield: {
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
        type: "json",
        value: buildMetafieldValue(config),
      },
    },
  };

  const data = await adminRequest<{
    discountAutomaticAppCreate: {
      automaticAppDiscount?: { id: string; discountId: string; title: string };
      userErrors: { field: string[]; message: string }[];
    };
  }>(
    admin,
    `#graphql
      mutation CreateDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            id
            discountId
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables
  );

  const result = data.discountAutomaticAppCreate;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((error) => `${error.field.join(".")}: ${error.message}`).join(", "));
  }

  if (!result.automaticAppDiscount) {
    throw new Error("Shopify did not return a discount id");
  }

  return result.automaticAppDiscount;
}

export async function updateDiscount(
  admin: AdminApiContext["admin"],
  discountId: string,
  functionId: string,
  config: DiscountConfiguration
): Promise<UpdateDiscountResult> {
  const variables = {
    id: discountId,
    automaticAppDiscount: {
      title: config.label,
      functionId,
      combinesWith: {
        productDiscounts: true,
        orderDiscounts: true,
        shippingDiscounts: true,
      },
      metafield: {
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
        type: "json",
        value: buildMetafieldValue(config),
      },
    },
  };

  const data = await adminRequest<{
    discountAutomaticAppUpdate: {
      automaticAppDiscount?: { id: string; discountId: string; title: string };
      userErrors: { field: string[]; message: string }[];
    };
  }>(
    admin,
    `#graphql
      mutation UpdateDiscount($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            id
            discountId
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables
  );

  const result = data.discountAutomaticAppUpdate;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((error) => `${error.field.join(".")}: ${error.message}`).join(", "));
  }

  if (!result.automaticAppDiscount) {
    throw new Error("Shopify did not return an updated discount id");
  }

  return result.automaticAppDiscount;
}
