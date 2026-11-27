export type ListingStatus = "pending" | "published" | "rejected" | "suspended";
export type PaymentStatus = "pending" | "confirmed" | "rejected";
export type PaymentMethod = "free_launch" | "bank_transfer" | "other";

export interface Listing {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  island: string;
  municipality: string;
  price: string;
  description: string;
  whatsapp: string;
  phone: string;
  image: string;
  ownerEmail: string;
  /** Local preview ownership identifier; not a verified account identity. */
  ownerAccountId?: string;
  listingStatus: ListingStatus;
  /** True only when an administrator selects this published listing for premium display. */
  isFeatured?: boolean;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  proofRef?: string;
  moderationNote?: string;
  slotNumber?: number;
  createdAt: string;
}

export type ListingRepositoryMode = "preview-local";

export interface ListingRepository {
  readonly mode: ListingRepositoryMode;
  loadListings(): Listing[];
  saveListings(listings: Listing[]): boolean;
  loadAudit(): string[];
  saveAudit(entries: string[]): boolean;
}

export const PREVIEW_LISTINGS_KEY = "caboverde-conecta-v2:preview:listings";
export const PREVIEW_AUDIT_KEY = "caboverde-conecta-v2:preview:audit";

function isStoredListing(value: unknown): value is Listing {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Listing>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.title === "string" &&
    typeof item.category === "string" &&
    typeof item.subcategory === "string" &&
    typeof item.island === "string" &&
    typeof item.municipality === "string" &&
    typeof item.price === "string" &&
    typeof item.description === "string" &&
    typeof item.whatsapp === "string" &&
    typeof item.phone === "string" &&
    typeof item.image === "string" &&
    typeof item.ownerEmail === "string" &&
    (item.ownerAccountId === undefined || typeof item.ownerAccountId === "string") &&
    ["pending", "published", "rejected", "suspended"].includes(item.listingStatus || "") &&
    ["pending", "confirmed", "rejected"].includes(item.paymentStatus || "") &&
    ["free_launch", "bank_transfer", "other"].includes(item.paymentMethod || "") &&
    typeof item.createdAt === "string"
  );
}

export function normalizeStoredListings(value: unknown): Listing[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStoredListing).map((item) => ({
    ...item,
    ownerAccountId: item.ownerAccountId || `preview-email:${item.ownerEmail.trim().toLowerCase()}`,
  })).slice(0, 500);
}

export function normalizeStoredAudit(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.slice(0, 1000))
    .slice(0, 2000);
}

export function readPreviewStorage<T>(
  key: string,
  fallback: T,
  normalize: (value: unknown) => T
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? normalize(JSON.parse(raw) as unknown) : fallback;
  } catch {
    return fallback;
  }
}

export function writePreviewStorage<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const previewListingRepository: ListingRepository = {
  mode: "preview-local",
  loadListings: () =>
    readPreviewStorage<Listing[]>(PREVIEW_LISTINGS_KEY, [], normalizeStoredListings),
  saveListings: (listings) =>
    writePreviewStorage(PREVIEW_LISTINGS_KEY, normalizeStoredListings(listings)),
  loadAudit: () => readPreviewStorage<string[]>(PREVIEW_AUDIT_KEY, [], normalizeStoredAudit),
  saveAudit: (entries) =>
    writePreviewStorage(PREVIEW_AUDIT_KEY, normalizeStoredAudit(entries)),
};
