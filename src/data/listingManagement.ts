import type { Listing } from "./listingRepository";
import type { AccountScope } from "./accountModel";
import { canManageListing } from "./accountModel";

/** Preview/domain helpers for future account dashboards; not server authorization. */
export function getAccountListings(listings: Listing[], account: AccountScope | null | undefined): Listing[] {
  if (!account || account.state !== "active") return [];
  if (account.role === "master" || account.role === "moderator") return [...listings];
  return listings.filter((listing) => listing.ownerAccountId === account.accountId);
}

export function canDeleteListing(listing: Listing, account: AccountScope | null | undefined): boolean {
  return canManageListing(account, listing.ownerAccountId || "");
}

export function makeListingAuditEntry(listingId: string, action: string, actorId: string): string {
  const safeAction = action.trim().slice(0, 120);
  const safeActor = actorId.trim().slice(0, 100);
  return `Gestão de anúncio ${listingId}: ${safeAction} — utilizador ${safeActor}`;
}
