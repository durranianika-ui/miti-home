import { COD_ALLOWED_EMIRATES, COD_ENABLED, COD_MAX_ORDER_TOTAL } from "../constants.ts";
import { formatPrice } from "../money.ts";

/** Why cash on delivery is unavailable for this order, or null when allowed. */
export function getCodUnavailableReason(input: { emirate: string; total: number }) {
  if (!COD_ENABLED) return "Cash on delivery is currently unavailable";
  if (!(COD_ALLOWED_EMIRATES as readonly string[]).includes(input.emirate)) {
    return `Cash on delivery isn't available in ${input.emirate || "this emirate"} yet`;
  }
  if (input.total > COD_MAX_ORDER_TOTAL) {
    return `Cash on delivery is available on orders up to ${formatPrice(COD_MAX_ORDER_TOTAL)}`;
  }
  return null;
}
