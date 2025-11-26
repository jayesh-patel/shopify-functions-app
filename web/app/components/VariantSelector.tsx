import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineStack,
  SkeletonBodyText,
  Text,
  TextField,
} from "@shopify/polaris";

import type { VariantSummary } from "~/types/variant";

interface Props {
  selected: VariantSummary[];
  onSelectedChange: (variants: VariantSummary[]) => void;
  inputName: string;
}

export function VariantSelector({ selected, onSelectedChange, inputName }: Props) {
  const fetcher = useFetcher<{ variants: VariantSummary[] }>();
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ q: searchValue });
      fetcher.load(`/app/variants?${params.toString()}`);
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchValue, fetcher]);

  useEffect(() => {
    // initial fetch
    fetcher.load(`/app/variants?q=${encodeURIComponent("")}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchResults = useMemo(() => fetcher.data?.variants ?? [], [fetcher.data]);

  function addVariant(variant: VariantSummary) {
    if (selected.find((item) => item.id === variant.id)) {
      return;
    }
    onSelectedChange([...selected, variant]);
  }

  function removeVariant(variantId: string) {
    onSelectedChange(selected.filter((variant) => variant.id !== variantId));
  }

  return (
    <Card>
      <Card.Header title="Eligible product variants" />
      <Card.Section>
        <Box paddingBlockEnd="400">
          <TextField
            label="Search products or SKUs"
            value={searchValue}
            onChange={setSearchValue}
            autoComplete="off"
            placeholder="Type to search"
          />
        </Box>
        <BlockStack gap="200">
          <Text variant="headingXs" as="h3">
            Search results
          </Text>
          {fetcher.state === "loading" && <SkeletonBodyText lines={3} />}
          {fetcher.state !== "loading" && searchResults.length === 0 && (
            <Text color="subdued">No results</Text>
          )}
          {searchResults.map((variant) => (
            <InlineStack key={variant.id} align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text as="span" fontWeight="medium">
                  {variant.productTitle}
                </Text>
                <Text as="span" color="subdued">
                  {variant.title}
                </Text>
                {variant.sku && (
                  <Badge tone="info" size="small">
                    SKU {variant.sku}
                  </Badge>
                )}
              </BlockStack>
              <Button onClick={() => addVariant(variant)} disabled={selected.some((item) => item.id === variant.id)}>
                Add
              </Button>
            </InlineStack>
          ))}
        </BlockStack>
      </Card.Section>
      <Divider />
      <Card.Section>
        <BlockStack gap="200">
          <Text variant="headingXs" as="h3">
            Selected variants ({selected.length})
          </Text>
          {selected.length === 0 && <Text color="subdued">No variants selected yet.</Text>}
          {selected.map((variant) => (
            <InlineStack key={variant.id} align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text as="span" fontWeight="medium">
                  {variant.productTitle}
                </Text>
                <Text as="span" color="subdued">
                  {variant.title}
                </Text>
                {variant.sku && (
                  <Badge tone="info" size="small">
                    SKU {variant.sku}
                  </Badge>
                )}
              </BlockStack>
              <Button variant="plain" tone="critical" onClick={() => removeVariant(variant.id)}>
                Remove
              </Button>
            </InlineStack>
          ))}
        </BlockStack>
      </Card.Section>
      <input type="hidden" name={inputName} value={JSON.stringify(selected.map((variant) => variant.id))} />
    </Card>
  );
}
