import type { Listing } from "./listingRepository";
import type { AccountScope } from "./accountModel";
import { canManageListing } from "./accountModel";

export type EditableListingFields = Pick<
  Listing,
  "title" | "category" | "subcategory" | "island" | "municipality" | "price" | "description" | "whatsapp" | "phone" | "image"
>;

export type ListingEditResult =
  | { ok: true; value: EditableListingFields }
  | { ok: false; errors: string[] };

/** Preview-side validation for an advertiser's edit form; not trusted-server validation. */
export function validateListingEdit(input: EditableListingFields): ListingEditResult {
  const value: EditableListingFields = {
    title: input.title.trim(),
    category: input.category.trim(),
    subcategory: input.subcategory.trim(),
    island: input.island.trim(),
    municipality: input.municipality.trim(),
    price: input.price.trim(),
    description: input.description.trim(),
    whatsapp: input.whatsapp.replace(/\\D/g, ""),
    phone: input.phone.replace(/\\D/g, ""),
    image: input.image.trim(),
  };
  const errors: string[] = [];
  if (value.title.length < 5 || value.title.length > 100) errors.push("Título: 5 a 100 caracteres.");
  if (!value.category || !value.subcategory) errors.push("Categoria e subcategoria são obrigatórias.");
  if (!value.island || !value.municipality) errors.push("Ilha e concelho são obrigatórios.");
  if (!value.price || value.price.length > 60) errors.push("Preço ou valor obrigatório (máximo 60 caracteres).");
  if (value.description.length > 3000) errors.push("Descrição: máximo 3.000 caracteres.");
  if (!value.whatsapp && !value.phone) errors.push("Indique WhatsApp ou telefone.");
  for (const contact of [value.whatsapp, value.phone].filter(Boolean)) {
    if (contact.length < 7 || contact.length > 15) errors.push("Contactos devem ter entre 7 e 15 dígitos.");
  }
  if (value.image) {
    try {
      const parsed = new URL(value.image);
      if (parsed.protocol !== "https:") throw new Error("HTTPS");
    } catch {
      errors.push("Imagem deve ser um URL HTTPS válido.");
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Advertiser may edit only own listings, and not rejected records in this preview policy. */
export function canEditListing(listing: Listing, account: AccountScope | null | undefined): boolean {
  return canManageListing(account, listing.ownerAccountId || "") &&
    (listing.listingStatus === "pending" || listing.listingStatus === "published" || listing.listingStatus === "suspended");
}

/** Applies editable fields without allowing ownership, payment, status, or ID to be overwritten. */
export function applyListingEdit(listing: Listing, fields: EditableListingFields): Listing {
  return { ...listing, ...fields };
}
