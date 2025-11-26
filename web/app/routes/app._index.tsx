import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Form,
  FormLayout,
  InlineGrid,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { VariantSelector } from "~/components/VariantSelector";
import { createDiscount, getFunctionId, updateDiscount } from "~/lib/discounts.server";
import { fetchVariantsByIds } from "~/lib/variants.server";
import { getBundleConfig, upsertBundleConfig } from "~/models/bundleConfig.server";
import { authenticate } from "~/shopify.server";
import type { VariantSummary } from "~/types/variant";

const formSchema = z.object({
  bundleSize: z.coerce.number().int().min(2),
  bundlePrice: z.coerce.number().positive(),
  label: z.string().min(3).max(60),
  variantIds: z.array(z.string()).min(1, "Select at least one product variant"),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const config = await getBundleConfig(session.shop);
  let functionId: string | null = null;
  let functionError: string | null = null;

  try {
    functionId = await getFunctionId(admin);
  } catch (error) {
    functionError = error instanceof Error ? error.message : String(error);
  }

  const variantIds = Array.isArray(config?.variantIds) ? (config?.variantIds as string[]) : [];
  const selectedVariants = await fetchVariantsByIds(admin, variantIds);

  return json({ config, selectedVariants, functionId, functionError });
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const rawVariantIds = formData.get("variantIds");
  let parsedVariantIds: unknown = [];

  if (typeof rawVariantIds === "string" && rawVariantIds.length) {
    try {
      parsedVariantIds = JSON.parse(rawVariantIds);
    } catch (error) {
      return json(
        {
          ok: false,
          errors: { variantIds: ["Could not parse the selected variants. Please try again."] },
        },
        { status: 400 }
      );
    }
  }

  const parsed = formSchema.safeParse({
    bundleSize: formData.get("bundleSize"),
    bundlePrice: formData.get("bundlePrice"),
    label: formData.get("label") ?? `${formData.get("bundleSize")} for $${formData.get("bundlePrice")}`,
    variantIds: parsedVariantIds,
  });

  if (!parsed.success) {
    return json(
      {
        ok: false,
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const existingConfig = await getBundleConfig(session.shop);
  let functionId: string;
  try {
    functionId = await getFunctionId(admin);
  } catch (error) {
    return json(
      {
        ok: false,
        errors: { function: [error instanceof Error ? error.message : String(error)] },
      },
      { status: 500 }
    );
  }

  let discount;
  try {
    discount = existingConfig?.discountNodeId
      ? await updateDiscount(admin, existingConfig.discountNodeId, functionId, payload)
      : await createDiscount(admin, functionId, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save the discount. Please try again.";
    return json(
      {
        ok: false,
        errors: {
          discount: [message],
        },
      },
      { status: 400 }
    );
  }

  const savedConfig = await upsertBundleConfig({
    shopDomain: session.shop,
    bundleSize: payload.bundleSize,
    bundlePrice: payload.bundlePrice,
    label: payload.label,
    variantIds: payload.variantIds,
    discountNodeId: discount.id,
  });

  return json({ ok: true, config: savedConfig, message: "Discount saved" });
}

export default function AppIndex() {
  const { config, selectedVariants, functionError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [variants, setVariants] = useState<VariantSummary[]>(selectedVariants);
  const [bundleSize, setBundleSize] = useState(String(config?.bundleSize ?? 4));
  const [bundlePrice, setBundlePrice] = useState(String(config?.bundlePrice ?? 20));
  const [label, setLabel] = useState(config?.label ?? "4 for $20");

  useEffect(() => {
    setVariants(selectedVariants);
  }, [selectedVariants]);

  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors ?? {};

  const summary = useMemo(() => {
    const size = Number(bundleSize);
    const price = Number(bundlePrice).toFixed(2);
    if (Number.isNaN(size) || Number.isNaN(Number(price))) {
      return "";
    }
    return `${size} items for $${price}`;
  }, [bundleSize, bundlePrice]);

  return (
    <Page title="X for Y discount">
      <Layout>
        <Layout.Section>
          {functionError && (
            <Banner tone="critical" title="Function missing">
              <p>{functionError}</p>
            </Banner>
          )}
          {actionData?.ok && (
            <Banner tone="success" title="Saved">
              <p>{actionData.message ?? "Discount updated."}</p>
            </Banner>
          )}
          {actionData?.errors && (
            <Banner tone="critical" title="Please fix the errors">
              <ul>
                {Object.entries(actionData.errors).map(([field, messages]) => (
                  <li key={field}>{`${field}: ${messages?.join(", ")}`}</li>
                ))}
              </ul>
            </Banner>
          )}
          <Card>
            <Card.Header title="Bundle configuration" subtitle="Set the purchase requirement and pricing." />
            <Card.Section>
              <Form method="post">
                <FormLayout>
                  <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                    <TextField
                      label="How many items trigger the discount?"
                      name="bundleSize"
                      type="number"
                      min={1}
                      value={bundleSize}
                      onChange={setBundleSize}
                      autoComplete="off"
                      required
                      error={errors.bundleSize?.[0]}
                    />
                    <TextField
                      label="Bundle price"
                      name="bundlePrice"
                      type="number"
                      min={0}
                      value={bundlePrice}
                      prefix="$"
                      onChange={setBundlePrice}
                      autoComplete="off"
                      required
                      error={errors.bundlePrice?.[0]}
                    />
                  </InlineGrid>
                  <TextField
                    label="Discount label"
                    name="label"
                    value={label}
                    onChange={setLabel}
                    helpText="Shown to buyers in cart and checkout"
                    autoComplete="off"
                    error={errors.label?.[0]}
                  />
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      {summary}
                    </Text>
                  </BlockStack>
                  <VariantSelector selected={variants} onSelectedChange={setVariants} inputName="variantIds" />
                  <Button submit variant="primary" loading={isSubmitting} disabled={isSubmitting}>
                    Save discount
                  </Button>
                </FormLayout>
              </Form>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
