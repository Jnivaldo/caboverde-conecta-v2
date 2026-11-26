import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type RequestRow = {
  id: string;
  requester_id: string;
  title: string;
  category: string;
  island: string;
  municipality: string;
  description: string;
  budget: string | null;
  requester_whatsapp: string | null;
  show_whatsapp: boolean;
  status: "active" | "negotiating" | "completed";
  moderation_status: "pending" | "approved" | "rejected";
  expires_at: string;
  created_at: string;
};

type OfferRow = {
  id: string;
  request_id: string;
  supplier_id: string;
  business_name: string;
  model: string;
  price_cve: number;
  condition: "new" | "used" | "refurbished";
  description: string;
  photo_url: string | null;
  supplier_whatsapp: string;
  moderation_status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Props = { canAdmin: boolean };
type View = "pending" | "requests" | "offers";

const panel: React.CSSProperties = {
  background: "linear-gradient(145deg,#111D31,#10182A)",
  border: "1px solid rgba(96,165,250,.28)",
  borderRadius: 16,
  padding: "1.1rem",
  display: "grid",
  gap: ".9rem",
};
const muted: React.CSSProperties = { color: "#AFC0D6", fontSize: ".82rem", lineHeight: 1.5 };
const button = (background: string, color = "#fff"): React.CSSProperties => ({
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 9,
  padding: ".58rem .78rem",
  background,
  color,
  fontWeight: 800,
  fontSize: ".78rem",
  cursor: "pointer",
});
const moderationLabel = (value: string) =>
  value === "approved" ? "Aprovado" : value === "rejected" ? "Rejeitado" : "Pendente";
const requestStatusLabel = (value: RequestRow["status"]) =>
  value === "completed" ? "Concluído" : value === "negotiating" ? "Em negociação" : "Ativo";
const dateLabel = (value: string) => new Date(value).toLocaleDateString("pt-PT");
const phoneDigits = (value: string) => value.replace(/\D/g, "");
const whatsappUrl = (value: string) => {
  const digits = phoneDigits(value);
  return digits ? "https://wa.me/" + digits : "";
};

export default function ProcuroAdminPanel({ canAdmin }: Props) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [view, setView] = useState<View>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const loadData = useCallback(async () => {
    if (!canAdmin) {
      setRequests([]);
      setOffers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [requestResult, offerResult] = await Promise.all([
      supabase.from("procurement_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("procurement_offers").select("*").order("created_at", { ascending: false }),
    ]);
    if (requestResult.error || offerResult.error) {
      setFeedback("Não foi possível carregar toda a gestão: " +
        (requestResult.error?.message || offerResult.error?.message || "erro desconhecido"));
    } else {
      setRequests((requestResult.data ?? []) as RequestRow[]);
      setOffers((offerResult.data ?? []) as OfferRow[]);
      setFeedback("");
    }
    setLoading(false);
  }, [canAdmin]);

  useEffect(() => { void loadData(); }, [loadData]);

  const pendingRequests = useMemo(
    () => requests.filter((item) => item.moderation_status === "pending"),
    [requests],
  );
  const pendingOffers = useMemo(
    () => offers.filter((item) => item.moderation_status === "pending"),
    [offers],
  );
  const requestTitles = useMemo(
    () => new Map(requests.map((item) => [item.id, item.title])),
    [requests],
  );

  async function moderateRequest(id: string, decision: "approved" | "rejected") {
    if (!canAdmin || busyId) return;
    setBusyId(id);
    setFeedback("");
    const { error } = await supabase.from("procurement_requests")
      .update({ moderation_status: decision }).eq("id", id);
    setBusyId(null);
    if (error) {
      setFeedback("Não foi possível atualizar o pedido: " + error.message);
      return;
    }
    setFeedback(decision === "approved" ? "Pedido aprovado e publicado." : "Pedido rejeitado.");
    await loadData();
  }

  async function moderateOffer(id: string, decision: "approved" | "rejected") {
    if (!canAdmin || busyId) return;
    setBusyId(id);
    setFeedback("");
    const { error } = await supabase.from("procurement_offers")
      .update({ moderation_status: decision }).eq("id", id);
    setBusyId(null);
    if (error) {
      setFeedback("Não foi possível atualizar a proposta: " + error.message);
      return;
    }
    setFeedback(decision === "approved" ? "Proposta aprovada." : "Proposta rejeitada.");
    await loadData();
  }

  async function updateRequestStatus(id: string, status: RequestRow["status"]) {
    if (!canAdmin || busyId) return;
    setBusyId(id);
    setFeedback("");
    const { error } = await supabase.from("procurement_requests")
      .update({ status }).eq("id", id);
    setBusyId(null);
    if (error) {
      setFeedback("Não foi possível atualizar o estado do pedido: " + error.message);
      return;
    }
    setFeedback("Estado do pedido atualizado.");
    await loadData();
  }

  if (!canAdmin) return null;

  const requestCard = (item: RequestRow, index: number) => {
    const accents = ["#38BDF8", "#4ADE80", "#C084FC", "#FBBF24", "#F472B6", "#2DD4BF"];
    const accent = accents[index % accents.length];
    const isBusy = busyId === item.id;
    return (
      <article key={item.id} style={{ border: "1px solid " + accent, borderLeft: "5px solid " + accent, borderRadius: 12, padding: ".95rem", background: "linear-gradient(135deg,rgba(255,255,255,.035),rgba(12,20,36,.92))", display: "grid", gap: ".65rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".6rem", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <span style={{ color: accent, fontSize: ".7rem", fontWeight: 900, letterSpacing: ".1em" }}>{item.category} · {item.island}</span>
            <h3 style={{ margin: ".25rem 0", color: "#F8FAFC", fontSize: "1.02rem", lineHeight: 1.35 }}>{item.title}</h3>
            <p style={{ ...muted, margin: 0 }}>{item.municipality} · Recebido em {dateLabel(item.created_at)} · Expira em {dateLabel(item.expires_at)}</p>
          </div>
          <span style={{ padding: ".28rem .58rem", borderRadius: 99, background: item.moderation_status === "approved" ? "rgba(22,163,74,.18)" : item.moderation_status === "rejected" ? "rgba(220,38,38,.18)" : "rgba(217,119,6,.2)", color: item.moderation_status === "approved" ? "#86EFAC" : item.moderation_status === "rejected" ? "#FCA5A5" : "#FCD34D", fontSize: ".72rem", fontWeight: 850 }}>{moderationLabel(item.moderation_status)}</span>
        </div>
        <p style={{ margin: 0, color: "#D3DEEC", fontSize: ".86rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{item.description}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem", color: "#C5D2E3", fontSize: ".78rem" }}>
          {item.budget && <span>Orçamento: <strong>{item.budget}</strong></span>}
          {item.show_whatsapp && item.requester_whatsapp
            ? <a href={whatsappUrl(item.requester_whatsapp)} target="_blank" rel="noreferrer" style={{ color: "#86EFAC", fontWeight: 800 }}>WhatsApp autorizado do requerente</a>
            : <span>WhatsApp do requerente: sem autorização pública</span>}
          <span>Estado: {requestStatusLabel(item.status)}</span>
        </div>
        <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
          {item.moderation_status === "pending" && <>
            <button type="button" disabled={!!busyId} onClick={() => void moderateRequest(item.id, "approved")} style={button("#15803D")}>{isBusy ? "A guardar…" : "Aprovar e publicar"}</button>
            <button type="button" disabled={!!busyId} onClick={() => void moderateRequest(item.id, "rejected")} style={button("#991B1B")}>Rejeitar</button>
          </>}
          {item.moderation_status === "approved" && item.status !== "completed" && <>
            <button type="button" disabled={!!busyId} onClick={() => void updateRequestStatus(item.id, "negotiating")} style={button("#1D4ED8")}>Em negociação</button>
            <button type="button" disabled={!!busyId} onClick={() => void updateRequestStatus(item.id, "completed")} style={button("#475569")}>Marcar concluído</button>
          </>}
          {item.status === "completed" && <button type="button" disabled={!!busyId} onClick={() => void updateRequestStatus(item.id, "active")} style={button("#1D4ED8")}>Reabrir pedido</button>}
        </div>
      </article>
    );
  };

  const offerCard = (item: OfferRow, index: number) => {
    const accents = ["#F59E0B", "#22D3EE", "#A78BFA", "#34D399", "#FB7185", "#60A5FA"];
    const accent = accents[index % accents.length];
    const isBusy = busyId === item.id;
    const contact = whatsappUrl(item.supplier_whatsapp);
    return (
      <article key={item.id} style={{ border: "1px solid " + accent, borderLeft: "5px solid " + accent, borderRadius: 12, padding: ".95rem", background: "linear-gradient(135deg,rgba(255,255,255,.035),rgba(12,20,36,.92))", display: "grid", gap: ".65rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ color: accent, fontSize: ".7rem", fontWeight: 900, letterSpacing: ".1em" }}>PROPOSTA · {item.business_name}</span>
            <h3 style={{ margin: ".25rem 0", color: "#F8FAFC", fontSize: "1rem" }}>{item.model}</h3>
            <p style={{ ...muted, margin: 0 }}>Pedido: {requestTitles.get(item.request_id) || "Pedido associado"} · {dateLabel(item.created_at)}</p>
          </div>
          <strong style={{ color: "#86EFAC", whiteSpace: "nowrap" }}>{Number(item.price_cve).toLocaleString("pt-PT")} CVE</strong>
        </div>
        <p style={{ margin: 0, color: "#D3DEEC", fontSize: ".86rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{item.description}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".55rem", alignItems: "center", color: "#B5C3D8", fontSize: ".78rem" }}>
          <span>Estado: {item.condition === "new" ? "Novo" : item.condition === "used" ? "Usado" : "Recondicionado"}</span>
          <span>· {moderationLabel(item.moderation_status)}</span>
          {contact && <a href={contact} target="_blank" rel="noreferrer" style={{ color: "#86EFAC", fontWeight: 800 }}>WhatsApp do fornecedor</a>}
          {item.photo_url && <a href={item.photo_url} target="_blank" rel="noreferrer" style={{ color: "#93C5FD", fontWeight: 800 }}>Ver fotografia</a>}
        </div>
        {item.moderation_status === "pending" && <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
          <button type="button" disabled={!!busyId} onClick={() => void moderateOffer(item.id, "approved")} style={button("#15803D")}>{isBusy ? "A guardar…" : "Aprovar proposta"}</button>
          <button type="button" disabled={!!busyId} onClick={() => void moderateOffer(item.id, "rejected")} style={button("#991B1B")}>Rejeitar proposta</button>
        </div>}
      </article>
    );
  };

  return (
    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".8rem", flexWrap: "wrap" }}>
        <div>
          <span style={{ color: "#38D6A0", fontSize: ".7rem", fontWeight: 900, letterSpacing: ".13em" }}>CENTRO DE CONTROLO</span>
          <h2 style={{ margin: ".25rem 0", color: "#F8FAFC", fontSize: "1.35rem" }}>Gestão de Procuro &amp; Ofereço</h2>
          <p style={{ ...muted, margin: 0 }}>Modere pedidos e propostas, acompanhe negociações e atualize estados sem sair do painel administrativo.</p>
        </div>
        <button type="button" onClick={() => void loadData()} disabled={loading} style={button("#1D4ED8")}>{loading ? "A atualizar…" : "Atualizar dados"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: ".6rem" }}>
        {[
          { label: "Pedidos", value: requests.length, color: "#60A5FA" },
          { label: "Pedidos pendentes", value: pendingRequests.length, color: "#FBBF24" },
          { label: "Propostas", value: offers.length, color: "#C084FC" },
          { label: "Propostas pendentes", value: pendingOffers.length, color: "#FB7185" },
        ].map((item) => <div key={item.label} style={{ padding: ".8rem", borderRadius: 11, border: "1px solid " + item.color, background: "rgba(8,16,30,.72)" }}>
          <div style={{ color: "#AFC0D6", fontSize: ".72rem", fontWeight: 750 }}>{item.label}</div>
          <strong style={{ display: "block", marginTop: ".2rem", color: item.color, fontSize: "1.55rem", lineHeight: 1.2 }}>{item.value}</strong>
        </div>)}
      </div>

      <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
        {[
          { key: "pending" as const, label: "Pendentes (" + (pendingRequests.length + pendingOffers.length) + ")" },
          { key: "requests" as const, label: "Todos os pedidos (" + requests.length + ")" },
          { key: "offers" as const, label: "Todas as propostas (" + offers.length + ")" },
        ].map((item) => <button key={item.key} type="button" onClick={() => setView(item.key)} style={{ ...button(view === item.key ? "#2563EB" : "#18263D"), borderColor: view === item.key ? "#60A5FA" : "rgba(181,195,216,.2)" }}>{item.label}</button>)}
      </div>

      {feedback && <div role="status" aria-live="polite" style={{ border: "1px solid rgba(96,165,250,.35)", background: "#14233D", color: "#DCE7F5", borderRadius: 10, padding: ".7rem .85rem", fontSize: ".83rem" }}>{feedback}</div>}
      {loading ? <p style={muted}>A carregar pedidos e propostas...</p> : view === "offers" ? (
        offers.length ? <div style={{ display: "grid", gap: ".7rem" }}>{offers.map(offerCard)}</div> : <p style={muted}>Ainda não existem propostas registadas.</p>
      ) : view === "requests" ? (
        requests.length ? <div style={{ display: "grid", gap: ".7rem" }}>{requests.map(requestCard)}</div> : <p style={muted}>Ainda não existem pedidos registados.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: ".65rem" }}>
            <h3 style={{ margin: 0, color: "#FCD34D", fontSize: ".95rem" }}>Pedidos à espera de aprovação</h3>
            {pendingRequests.length ? pendingRequests.map(requestCard) : <p style={muted}>Não há pedidos pendentes.</p>}
          </div>
          <div style={{ display: "grid", gap: ".65rem" }}>
            <h3 style={{ margin: 0, color: "#F9A8D4", fontSize: ".95rem" }}>Propostas à espera de aprovação</h3>
            {pendingOffers.length ? pendingOffers.map(offerCard) : <p style={muted}>Não há propostas pendentes.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
