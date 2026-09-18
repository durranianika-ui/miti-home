/**
 * UAE address and phone validation shared by checkout (client) and the order
 * API (server). Keep this file free of `@/` imports: it is loaded by the node
 * test runner.
 */
import { SHIPPING_EMIRATES, UAE_EMIRATES, type UaeEmirate } from "./constants.ts";

export type UaeShippingAddress = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emirate: string;
  area: string;
  building: string;
  apartment?: string;
  street?: string;
  instructions?: string;
};

export const EMPTY_UAE_ADDRESS: UaeShippingAddress = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  emirate: "Dubai",
  area: "",
  building: "",
  apartment: "",
  street: "",
  instructions: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Normalises UAE numbers to E.164 (+971…). Accepts 05X XXX XXXX, 5X XXX XXXX,
 * 00971…, +971… and landlines (04 …, 02 …). Returns null when invalid.
 */
export function normalizeUaePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string;

  if (digits.startsWith("+971")) national = digits.slice(4);
  else if (digits.startsWith("00971")) national = digits.slice(5);
  else if (digits.startsWith("971") && digits.length >= 11) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;

  national = national.replace(/^0+/, "");

  // Mobile: 5X + 7 digits (50, 52, 54, 55, 56, 58)
  if (/^5[024568]\d{7}$/.test(national)) return `+971${national}`;
  // Landline: area code (2,3,4,6,7,9) + 7 digits
  if (/^[234679]\d{7}$/.test(national)) return `+971${national}`;
  return null;
}

export function formatUaePhone(e164: string) {
  const national = e164.replace(/^\+971/, "");
  if (national.startsWith("5")) {
    return `+971 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }
  return `+971 ${national.slice(0, 1)} ${national.slice(1, 4)} ${national.slice(4)}`;
}

export function isUaeEmirate(value: string): value is UaeEmirate {
  return (UAE_EMIRATES as readonly string[]).includes(value);
}

export type AddressField = keyof UaeShippingAddress;

export function validateUaeAddress(address: Partial<UaeShippingAddress>) {
  const errors: Partial<Record<AddressField, string>> = {};
  const value = (field: AddressField) => (address[field] ?? "").toString().trim();

  if (!value("firstName")) errors.firstName = "First name is required";
  if (!value("lastName")) errors.lastName = "Last name is required";

  if (!value("email")) errors.email = "Email is required";
  else if (!EMAIL_PATTERN.test(value("email"))) errors.email = "Enter a valid email address";

  if (!value("phone")) errors.phone = "Mobile number is required";
  else if (!normalizeUaePhone(value("phone"))) errors.phone = "Enter a valid UAE number, e.g. 050 123 4567";

  if (!value("emirate")) errors.emirate = "Select an emirate";
  else if (!isUaeEmirate(value("emirate"))) errors.emirate = "Select a UAE emirate";
  else if (!(SHIPPING_EMIRATES as readonly string[]).includes(value("emirate"))) {
    errors.emirate = "We don't deliver to this emirate yet";
  }

  if (!value("area")) errors.area = "Area is required";
  if (!value("building")) errors.building = "Building or villa is required";

  for (const field of ["firstName", "lastName", "area", "building", "apartment", "street"] as const) {
    if (value(field).length > 120) errors[field] = "Keep this under 120 characters";
  }
  if (value("instructions").length > 500) errors.instructions = "Keep delivery instructions under 500 characters";

  return errors;
}

/** Trims, normalises the phone and drops unknown keys. Throws when invalid. */
export function sanitizeUaeAddress(address: unknown): UaeShippingAddress {
  if (!address || typeof address !== "object") {
    throw new Error("Shipping address is required");
  }
  const input = address as Record<string, unknown>;
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");

  const candidate: UaeShippingAddress = {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email").toLowerCase(),
    phone: text("phone"),
    emirate: text("emirate"),
    area: text("area"),
    building: text("building"),
    apartment: text("apartment"),
    street: text("street"),
    instructions: text("instructions"),
  };

  const errors = validateUaeAddress(candidate);
  const firstError = Object.values(errors)[0];
  if (firstError) throw new Error(firstError);

  return { ...candidate, phone: normalizeUaePhone(candidate.phone)! };
}

export function fullName(address: Pick<UaeShippingAddress, "firstName" | "lastName">) {
  return `${address.firstName} ${address.lastName}`.trim();
}

/** Multi-line human-readable address for emails, admin and order history. */
export function formatUaeAddressLines(address: Partial<UaeShippingAddress> | null | undefined) {
  if (!address) return [];
  const unit = [address.apartment, address.building].filter(Boolean).join(", ");
  return [
    unit,
    address.street,
    [address.area, address.emirate].filter(Boolean).join(", "),
    "United Arab Emirates",
  ].filter((line): line is string => Boolean(line && line.trim()));
}
