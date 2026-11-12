import "server-only";
import { z } from "zod";
import { EMAIL_INVALID } from "@/lib/copy";
import { LIMITS } from "@/lib/leads/constants";
import { customersStore, getSettings } from "./collections";
import { newId } from "./ids";

// The buyer, on a sale, a deposit or a factory order: a customer already on file, or a new one made from a name and a phone or an email.
// The fields go into each form's schema; buyerOf turns them into a customer id (making the customer when new) and a known salesperson.
export const buyerFields = {
  salesperson: z.string().max(80).optional(),
  customerId: z.string().max(40).optional(),
  name: z.string().trim().max(80).optional(),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().toLowerCase().email(EMAIL_INVALID).max(LIMITS.email).optional()),
  phone: z.string().trim().max(30).optional(),
};
type Buyer = { salesperson?: string; customerId?: string; name?: string; email?: string; phone?: string };
export async function buyerOf(d: Buyer, source: string): Promise<{ customerId: string; salesperson?: string } | { errors: Record<string, string> }> {
  const { team } = await getSettings();
  const salesperson = team.some((t) => t.name === d.salesperson) ? d.salesperson : undefined;
  if (d.customerId && (await customersStore.get(d.customerId))) return { customerId: d.customerId, salesperson };
  if (!d.name) return { errors: { name: "Choose a customer, or enter the new customer's name" } };
  if (!d.email && !d.phone) return { errors: { phone: "Enter a phone number or an email" } };
  const customerId = newId("cust");
  const at = Date.now();
  await customersStore.put({ id: customerId, name: d.name, email: d.email ?? "", phone: d.phone ?? "", source, marketingConsent: false, createdAt: at, lastContactAt: at });
  return { customerId, salesperson };
}
