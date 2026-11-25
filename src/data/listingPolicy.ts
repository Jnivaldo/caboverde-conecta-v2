import type { ListingStatus, PaymentStatus } from "./listingRepository";
import type { AccountScope } from "./accountModel";
import { canModerateListings, canManageListing } from "./accountModel";

export interface ListingChange {
  listingStatus?: ListingStatus;
  paymentStatus?: PaymentStatus;
}

const transitions: Record<ListingStatus, ListingStatus[]> = {
  pending: ["published", "rejected", "suspended"],
  published: ["suspended", "rejected"],
  suspended: ["published", "rejected"],
  rejected: [],
};

/** UI/domain guard only; authoritative enforcement belongs on a trusted server. */
export function canApplyListingChange(
  account: AccountScope | null | undefined,
  currentStatus: ListingStatus,
  change: ListingChange,
  ownerAccountId: string
): boolean {
  if (!canManageListing(account, ownerAccountId)) return false;
  if (change.listingStatus && change.listingStatus !== currentStatus) {
    if (!transitions[currentStatus].includes(change.listingStatus)) return false;
    if (!canModerateListings(account)) return false;
  }
  if (change.paymentStatus && change.paymentStatus !== "pending") {
    if (!canModerateListings(account)) return false;
  }
  return true;
}

export function allowedListingStatusTransitions(status: ListingStatus): ListingStatus[] {
  return [...transitions[status]];
}
