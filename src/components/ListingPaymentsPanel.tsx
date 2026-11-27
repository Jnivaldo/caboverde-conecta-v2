import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ListingItem = {
  id: string;
  title: string;
  paymentStatus: string;
  listingStatus: string;
  paymentMethod: string;
};
type PaymentRow = {
  id: string;
  listing_id: string;
  user_id: string;
  bank: "BCA" | "BCN";
  amount_cve: number;
  transfer_reference: string;
  proof_path: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
};
type Props = {
  userId: string | null;
  listings: ListingItem[];
  canAdmin: boolean;
  onPaymentReviewed?: (listingId: string, decision: "approved" | "rejected") => void;
};
const card: React.CSSProperties = {
  display: "grid", gap: ".7rem", padding: "1rem", borderRadius: 13,
  border: "1px solid rgba(96,165,250,.28)", background: "rgba(15,27,46,.88)"
};
const field: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: ".7rem .8rem",
  borderRadius: 9, border: "1px solid rgba(148,163,184,.35)",
  background: "#0B1424", color: "#F8FAFC", fontSize: ".9rem"
};
const action: React.CSSProperties = {
  border: 0, borderRadius: 9, padding: ".65rem .9rem",
  background: "#2563EB", color: "#fff", fontWeight: 750, cursor: "pointer"
};
const statusLabel = (status: PaymentRow["status"]) =>
  status === "approved" ? "Aprovado" : status === "rejected" ? "Rejeitado" : "Em análise";
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-PT");

export default function ListingPaymentsPanel({ userId, listings, canAdmin, onPaymentReviewed }: Props) {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [bankByListing, setBankByListing] = useState<Record<string, "BCA" | "BCN">>({});
  const [referenceByListing, setReferenceByListing] = useState<Record<string, string>>({});
  const [fileByListing, setFileByListing] = useState<Record<string, File | undefined>>({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!userId && !canAdmin) { setRows([]); return; }
    let query = supabase.from("listing_payment_submissions").select("*").order("created_at", { ascending: false });
    if (!canAdmin && userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) { setFeedback("Não foi possível carregar os pagamentos: " + error.message); return; }
    const paymentRows = (data ?? []) as PaymentRow[];
    setRows(paymentRows);
    if (paymentRows.length) {
      const ids = Array.from(new Set(paymentRows.map((row) => row.listing_id)));
      const { data: listingRows } = await supabase.from("listings").select("id,title").in("id", ids);
      setTitles(Object.fromEntries((listingRows ?? []).map((item) => [String(item.id), String(item.title)])));
    } else {
      setTitles({});
    }
  }, [userId, canAdmin]);

  useEffect(() => { void load(); }, [load]);

  async function submitProof(listing: ListingItem) {
    if (!userId || busy) return;
    const file = fileByListing[listing.id];
    const reference = (referenceByListing[listing.id] ?? "").trim();
    const bank = bankByListing[listing.id] ?? "BCA";
    if (!reference || reference.length < 3) { setFeedback("Indique a referência da transferência."); return; }
    if (!file) { setFeedback("Selecione o comprovativo da transferência."); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFeedback("O comprovativo deve ser JPG, PNG, WEBP ou PDF, até 5 MB."); return;
    }
    setBusy(listing.id); setFeedback("");
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-70);
    const path = userId + "/" + listing.id + "/" + crypto.randomUUID() + "-" + safeName;
    const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file, {
      upsert: false, contentType: file.type, cacheControl: "3600"
    });
    if (uploadError) {
      setFeedback("Falha ao enviar o comprovativo: " + uploadError.message); setBusy(null); return;
    }
    const { error } = await supabase.from("listing_payment_submissions").insert({
      listing_id: listing.id, user_id: userId, bank, amount_cve: 1500,
      transfer_reference: reference, proof_path: path, status: "pending"
    });
    if (error) {
      setFeedback("O ficheiro foi recebido, mas não foi possível registar o pedido. Contacte a administração antes de repetir. " + error.message);
    } else {
      setFeedback("Comprovativo enviado. O anúncio aguarda a validação da administração.");
      setReferenceByListing((prev) => ({ ...prev, [listing.id]: "" }));
      setFileByListing((prev) => ({ ...prev, [listing.id]: undefined }));
      await load();
    }
    setBusy(null);
  }

  async function review(row: PaymentRow, decision: "approved" | "rejected") {
    if (!canAdmin || busy) return;
    setBusy(row.id); setFeedback("");
    const { error } = await supabase.rpc("review_listing_payment", {
      p_payment_id: row.id, p_decision: decision, p_admin_note: null
    });
    if (error) setFeedback("Não foi possível rever o pagamento: " + error.message);
    else {
      setFeedback(decision === "approved" ? "Pagamento aprovado. O anúncio segue para a análise de conteúdo." : "Comprovativo rejeitado. O anunciante pode enviar um comprovativo corrigido.");
      onPaymentReviewed?.(row.listing_id, decision);
    }
    await load(); setBusy(null);
  }

  async function openProof(row: PaymentRow) {
    const proofWindow = window.open("about:blank", "_blank");
    if (!proofWindow) {
      setFeedback("O navegador bloqueou a nova janela. Permita pop-ups para abrir o comprovativo.");
      return;
    }
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(row.proof_path, 300);
    if (error || !data?.signedUrl) {
      proofWindow.close();
      setFeedback("Não foi possível abrir o comprovativo: " + (error?.message ?? "erro"));
      return;
    }
    setProofUrls((prev) => ({ ...prev, [row.id]: data.signedUrl }));
    proofWindow.opener = null;
    proofWindow.location.href = data.signedUrl;
  }

  const pendingListings = listings.filter((item) =>
    item.listingStatus === "pending" && item.paymentStatus === "pending" && item.paymentMethod === "bank_transfer" &&
    !rows.some((row) => row.listing_id === item.id && row.status === "pending")
  );

  if (!userId && !canAdmin) return null;
  if (!canAdmin) {
    return (
      <section style={{ ...card, marginBottom: "1rem" }}>
        <div>
          <span style={{ color: "#FBBF24", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".08em" }}>
            PAGAMENTOS TEMPORARIAMENTE INDISPONÍVEIS
          </span>
          <h2 style={{ margin: ".25rem 0", color: "#F8FAFC", fontSize: "1.2rem" }}>
            Pagamento por anúncio
          </h2>
          <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".84rem", lineHeight: 1.5 }}>
            A cobrança ainda não está ativa. Não faça transferências nem envie comprovativos.
            Quando os pagamentos forem oficialmente disponibilizados, esta área será atualizada
            com instruções verificadas.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section style={{ ...card, marginBottom: "1rem" }}>
      <div>
        <span style={{ color: "#60A5FA", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".08em" }}>
          {canAdmin ? "GESTÃO FINANCEIRA" : "PAGAMENTOS DOS ANÚNCIOS"}
        </span>
        <h2 style={{ margin: ".25rem 0", color: "#F8FAFC", fontSize: "1.2rem" }}>
          {canAdmin ? "Comprovativos para validação" : "Pagamento por transferência"}
        </h2>
        <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".84rem", lineHeight: 1.5 }}>
          {canAdmin
            ? "Confirme o crédito bancário antes de aprovar. A aprovação fica registada com a conta administrativa."
            : "Valor por anúncio: 1.500 CVE. Envie o comprovativo depois de efetuar a transferência para BCA ou BCN. A publicação continua sujeita à análise do anúncio."}
        </p>
      </div>
      {!canAdmin && (pendingListings.length > 0 || rows.some((row) => row.status === "pending")) && (
        <div style={{ ...card, background: "linear-gradient(145deg,rgba(17,29,49,.98),rgba(16,24,42,.98))" }}>
          <strong style={{ color: "#F8FAFC" }}>Contas para transferência — 1.500 CVE</strong>
          <div style={{ display: "grid", gap: ".65rem", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <div style={{ border: "1px solid rgba(96,165,250,.25)", borderRadius: 10, padding: ".8rem" }}>
              <strong style={{ color: "#DBEAFE" }}>BCA — Banco Comercial do Atlântico</strong>
              <div style={{ color: "#94A3B8", fontSize: ".76rem", marginTop: ".45rem" }}>Titular</div>
              <strong style={{ color: "#F8FAFC", fontSize: ".86rem" }}>José Nivaldo G. Oliveira</strong>
              <div style={{ color: "#94A3B8", fontSize: ".76rem", marginTop: ".4rem" }}>IBAN</div>
              <strong style={{ color: "#DBEAFE", fontSize: ".82rem", overflowWrap: "anywhere" }}>CV64 0003 0000 7050 3384 1017 6</strong>
              <div style={{ color: "#94A3B8", fontSize: ".76rem", marginTop: ".4rem" }}>NIB</div>
              <strong style={{ color: "#DBEAFE", fontSize: ".82rem", overflowWrap: "anywhere" }}>000300007050338410176</strong>
            </div>
            <div style={{ border: "1px solid rgba(96,165,250,.25)", borderRadius: 10, padding: ".8rem" }}>
              <strong style={{ color: "#DBEAFE" }}>BCN — Banco Cabo-verdiano de Negócios</strong>
              <div style={{ color: "#94A3B8", fontSize: ".76rem", marginTop: ".45rem" }}>Titular</div>
              <strong style={{ color: "#F8FAFC", fontSize: ".86rem" }}>José Nivaldo G. Oliveira</strong>
              <div style={{ color: "#94A3B8", fontSize: ".76rem", marginTop: ".4rem" }}>Número de conta</div>
              <strong style={{ color: "#DBEAFE", fontSize: ".82rem" }}>119418310001</strong>
              <div style={{ color: "#94A3B8", fontSize: ".76rem", marginTop: ".4rem" }}>NIB</div>
              <strong style={{ color: "#DBEAFE", fontSize: ".82rem", overflowWrap: "anywhere" }}>000400000119418310146</strong>
            </div>
          </div>
          <p style={{ margin: 0, color: "#FDE68A", fontSize: ".78rem", lineHeight: 1.45 }}>Efetue a transferência apenas para um anúncio submetido com pagamento de 1.500 CVE. Envie o comprovativo e aguarde a validação da administração. Não faça pagamentos antecipados.</p>
        </div>
      )}
      {feedback && <div role="status" style={{ color: "#93C5FD", fontSize: ".84rem" }}>{feedback}</div>}

      {!canAdmin && pendingListings.map((listing) => (
        <div key={listing.id} style={{ ...card, background: "#0B1424" }}>
          <strong style={{ color: "#F8FAFC" }}>{listing.title}</strong>
          <label style={{ display: "grid", gap: ".3rem", color: "#CBD5E1", fontSize: ".82rem" }}>
            Banco utilizado
            <select value={bankByListing[listing.id] ?? "BCA"} onChange={(e) => setBankByListing((prev) => ({ ...prev, [listing.id]: e.target.value as "BCA" | "BCN" }))} style={field}>
              <option value="BCA">BCA — Banco Comercial do Atlântico</option>
              <option value="BCN">BCN — Banco Cabo-verdiano de Negócios</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: ".3rem", color: "#CBD5E1", fontSize: ".82rem" }}>
            Referência da transferência
            <input value={referenceByListing[listing.id] ?? ""} onChange={(e) => setReferenceByListing((prev) => ({ ...prev, [listing.id]: e.target.value }))} maxLength={120} placeholder="Introduza a referência" style={field} />
          </label>
          <label style={{ display: "grid", gap: ".3rem", color: "#CBD5E1", fontSize: ".82rem" }}>
            Comprovativo (JPG, PNG, WEBP ou PDF · máximo 5 MB)
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFileByListing((prev) => ({ ...prev, [listing.id]: e.target.files?.[0] }))} style={{ ...field, padding: ".55rem" }} />
          </label>
          <button type="button" disabled={busy === listing.id} onClick={() => void submitProof(listing)} style={{ ...action, opacity: busy === listing.id ? .6 : 1 }}>
            {busy === listing.id ? "A enviar…" : "Enviar comprovativo"}
          </button>
        </div>
      ))}

      {pendingListings.length === 0 && !canAdmin && (
        <p style={{ margin: 0, color: "#94A3B8", fontSize: ".84rem" }}>Não há anúncios pendentes de pagamento que precisem de comprovativo neste momento.</p>
      )}

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: "#94A3B8", fontSize: ".84rem" }}>Ainda não existem comprovativos registados.</p>
      ) : rows.map((row) => (
        <div key={row.id} style={{ ...card, background: "#0B1424" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap" }}>
            <strong style={{ color: "#F8FAFC" }}>{titles[row.listing_id] ?? "Anúncio"} · {row.amount_cve.toLocaleString("pt-PT")} CVE</strong>
            <span style={{ color: row.status === "approved" ? "#34D399" : row.status === "rejected" ? "#F87171" : "#FBBF24", fontWeight: 800, fontSize: ".8rem" }}>{statusLabel(row.status)}</span>
          </div>
          <div style={{ color: "#B5C3D8", fontSize: ".82rem" }}>
            {row.bank} · Referência: {row.transfer_reference} · {dateLabel(row.created_at)}
          </div>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => void openProof(row)} style={action}>Abrir comprovativo</button>
            {canAdmin && row.status === "pending" && <>
              <button type="button" disabled={busy === row.id} onClick={() => void review(row, "approved")} style={{ ...action, background: "#047857" }}>Aprovar pagamento</button>
              <button type="button" disabled={busy === row.id} onClick={() => void review(row, "rejected")} style={{ ...action, background: "#991B1B" }}>Rejeitar</button>
            </>}
          </div>
          {row.admin_note && <p style={{ margin: 0, color: "#CBD5E1", fontSize: ".82rem" }}>Nota administrativa: {row.admin_note}</p>}
        </div>
      ))}
    </section>
  );
}
