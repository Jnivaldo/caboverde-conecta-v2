export type AccountRole = "advertiser" | "moderator" | "master";
export type AccountState = "pending" | "active" | "blocked";

export interface AdvertiserAccount {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  state: AccountState;
  createdAt: string;
}

export interface AccountScope {
  accountId: string;
  role: AccountRole;
  state: AccountState;
}

/**
 * Client-side policy helpers for upcoming account workflows.
 * These functions are NOT a security boundary: authorization must be enforced
 * on the server before accounts or listings become shared or operational.
 */
export function isAccountActive(account: AccountScope | null | undefined): boolean {
  return !!account && account.state === "active";
}

export function canManageListing(
  account: AccountScope | null | undefined,
  ownerAccountId: string
): boolean {
  if (!isAccountActive(account)) return false;
  if (account.role === "master" || account.role === "moderator") return true;
  return account.role === "advertiser" && account.accountId === ownerAccountId;
}

export function canModerateListings(account: AccountScope | null | undefined): boolean {
  return isAccountActive(account) && (account.role === "master" || account.role === "moderator");
}

export function canManagePlatformAccounts(account: AccountScope | null | undefined): boolean {
  return isAccountActive(account) && account.role === "master";
}
