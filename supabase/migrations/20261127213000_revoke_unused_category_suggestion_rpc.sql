-- Category suggestion workflow was removed from the product UI.
-- Revoke authenticated access to the privileged RPC to reduce exposed attack surface.
REVOKE EXECUTE ON FUNCTION public.review_category_suggestion(uuid, text, text) FROM authenticated;
