import { run } from "@shopify/shopify_function";

type Configuration = {
  bundleQuantity: number;
  bundlePrice: number;
  label: string;
  variantIds: string[];
};

type CartLine = {
  id: string;
  quantity: number;
  cost: { amountPerQuantity: { amount: string } };
  merchandise: { id: string };
};

type Input = {
  cart: { lines: CartLine[] };
  configuration: Configuration;
};

type Discount = {
  targets: { cartLineId: string }[];
  value: { fixedAmount: { amount: string; appliesToEachItem: boolean } };
  message: string;
};

run<Input>(({ cart, configuration }) => {
  const eligibleLines = cart.lines.filter((line) => configuration.variantIds.includes(line.merchandise.id));
  if (!eligibleLines.length) {
    return emptyResult();
  }

  const bundleQuantity = Math.max(Number(configuration.bundleQuantity) || 1, 1);
  const bundlePrice = Number(configuration.bundlePrice) || 0;

  const unitItems = eligibleLines.flatMap((line) => {
    const unitPrice = Number(line.cost.amountPerQuantity.amount);
    return Array.from({ length: line.quantity }).map(() => ({ lineId: line.id, unitPrice }));
  });

  const bundleCount = Math.floor(unitItems.length / bundleQuantity);
  if (bundleCount <= 0) {
    return emptyResult();
  }

  const discountedItems = unitItems
    .sort((a, b) => b.unitPrice - a.unitPrice)
    .slice(0, bundleCount * bundleQuantity);

  const totalSelectedPrice = discountedItems.reduce((total, item) => total + item.unitPrice, 0);
  const targetPrice = bundleCount * bundlePrice;
  const discountTotal = parseFloat((totalSelectedPrice - targetPrice).toFixed(2));

  if (discountTotal <= 0) {
    return emptyResult();
  }

  const allocation = new Map<string, { amount: number; units: number }>();
  discountedItems.forEach((item) => {
    const current = allocation.get(item.lineId) ?? { amount: 0, units: 0 };
    allocation.set(item.lineId, { amount: current.amount + item.unitPrice, units: current.units + 1 });
  });

  const discounts: Discount[] = [];
  allocation.forEach((value, lineId) => {
    const shareRatio = value.amount / totalSelectedPrice;
    const lineDiscountTotal = parseFloat((shareRatio * discountTotal).toFixed(2));
    if (lineDiscountTotal <= 0) {
      return;
    }
    const perUnitDiscount = Math.min(value.amount / value.units, lineDiscountTotal / value.units);
    discounts.push({
      message: configuration.label,
      targets: [{ cartLineId: lineId }],
      value: {
        fixedAmount: {
          amount: perUnitDiscount.toFixed(2),
          appliesToEachItem: true,
        },
      },
    });
  });

  if (!discounts.length) {
    return emptyResult();
  }

  return {
    discounts,
    discountApplicationStrategy: "MAXIMUM",
  };
});

function emptyResult() {
  return {
    discounts: [],
    discountApplicationStrategy: "MAXIMUM" as const,
  };
}
