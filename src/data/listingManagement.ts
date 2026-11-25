import type { Listing, ListingStatus } from "./listingRepository";
import type { AccountScope } from "./accountModel";
import { canManageListing } from "./accountModel";

/** Preview/domain helpers for future account dashboards; not server authorization. */
export function getAccountListings(listings: Listing[], account: AccountScope | null | undefined): Listing[] {
  if (!account || account.state !== "active") return [];
  if (account.role === "master" || account.role === "moderator") return [...listings];
  return listings.filter((listing) => listing.ownerAccountId === account.accountId);
}

/** Local preview fallback: identify listings by email, not an authenticated account. */
export function getPreviewListingsByEmail(listings: Listing[], email: string): Listing[] {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  const id = `preview-email:${normalized}`;
  return listings.filter((listing) =>
    listing.ownerAccountId === id || listing.ownerEmail.trim().toLowerCase() === normalized
  );
}

export function countListingsByStatus(listings: Listing[]): Record<ListingStatus, number> {
  return listings.reduce((counts, listing) => {
    counts[listing.listingStatus] += 1;
    return counts;
  }, { pending: 0, published: 0, rejected: 0, suspended: 0 });
}

export function canDeleteListing(listing: Listing, account: AccountScope | null | undefined): boolean {
  return canManageListing(account, listing.ownerAccountId || "");
}

export function makeListingAuditEntry(listingId: string, action: string, actorId: string): string {
  const safeAction = action.trim().slice(0, 120);
  const safeActor = actorId.trim().slice(0, 100);
  return `Gestão de anúncio ${listingId}: ${safeAction} — utilizador ${safeActor}`;
}
