import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getSearchMatch } from "../lib/smartSearch";

type PublicRequest = {
  id: string;
  title: string;
  category: string;
  island: string;
  municipality: string;
  description: string;
  status: string;
  expires_at: string;
  created_at: string;
};

type PublicOffer = {
  id: string;
  request_id: string;
  business_name: string;
  model: string;
  price_cve: number;
  condition: string;
  description: string;
  created_at: string;
};

type Props = { query: string; onOpenProcurement: () => void };

const panelStyle: React.CSSProperties = {
  padding: "1rem",
  borderRadius: 14,
  border: "1px solid rgba(96,165,250,.28)",
  background: "#10182A",
  color: "#F8FAFC",
};

export default function UnifiedProcurementSearch({ query, onOpenProcurement }: Props) {
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const [requestResult, offerResult] = await Promise.all([
        supabase.from("public_procurement_requests").select("id,title,category,island,municipality,description,status,expires_at,created_at").order("created_at", { ascending: false }),
        supabase.from("public_procurement_offers").select("id,request_id,business_name,model,price_cve,condition,description,created_at").order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (requestResult.error || offerResult.error) {
        setError("Não foi possível consultar Procuro & Ofereço neste momento.");
        setLoading(false);
        return;
      }
      setRequests((requestResult.data ?? []) as PublicRequest[]);
      setOffers((offerResult.data ?? []) as PublicOffer[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const results = useMemo(() => {
    const term = query.trim();
    const empty = { exactRequests: [] as PublicRequest[], relatedRequests: [] as PublicRequest[], exactOffers: [] as PublicOffer[], relatedOffers: [] as PublicOffer[] };
    if (!term) return empty;

    const now = Date.now();
    const activeRequests = requests.filter((item) =>
      item.status !== "completed" && Date.parse(item.expires_at) > now
    );
    const requestById = new Map(activeRequests.map((item) => [item.id, item]));
    const exactRequests: PublicRequest[] = [];
    const relatedRequests: PublicRequest[] = [];
    const exactOffers: PublicOffer[] = [];
    const relatedOffers: PublicOffer[] = [];

    for (const item of activeRequests) {
      const match = getSearchMatch(term, [item.title, item.description, item.category, item.island, item.municipality]);
      if (match === "exact") exactRequests.push(item);
      else if (match === "related") relatedRequests.push(item);
    }

    for (const offer of offers) {
      const parent = requestById.get(offer.request_id);
      if (!parent) continue;
      const match = getSearchMatch(term, [
        offer.model, offer.business_name, offer.description, parent.title, parent.category,
        parent.island, parent.municipality,
      ]);
      if (match === "exact") exactOffers.push(offer);
      else if (match === "related") relatedOffers.push(offer);
    }

    return { exactRequests, relatedRequests, exactOffers, relatedOffers };
  }, [query, requests, offers]);

  if (!query.trim()) return null;

  const requestById = new Map(requests.map((item) => [item.id, item]));
  const exactTotal = results.exactRequests.length + results.exactOffers.length;
  const relatedTotal = results.relatedRequests.length + results.relatedOffers.length;
  const total = exactTotal + relatedTotal;

  const renderRequests = (items: PublicRequest[]) => items.length > 0 && (
    <div style={{ display: "grid", gap: ".55rem" }}>
      <strong style={{ color: "#FCA5A5", fontSize: ".9rem" }}>Pessoas que procuram ({items.length})</strong>
      {items.map((item) => (
        <article key={item.id} style={{ padding: ".8rem", borderRadius: 10, border: "1px solid rgba(248,113,113,.35)", background: "rgba(127,29,29,.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".45rem", flexWrap: "wrap" }}><span style={{ padding: ".16rem .45rem", borderRadius: 6, background: "rgba(248,113,113,.14)", color: "#FCA5A5", fontSize: ".67rem", fontWeight: 850, letterSpacing: ".04em" }}>PROCURO &amp; OFEREÇO · PEDIDO</span><strong>{item.title}</strong></div>
          <p style={{ margin: ".3rem 0", color: "#C2D0E3", fontSize: ".82rem", lineHeight: 1.45 }}>{item.description}</p>
          <span style={{ color: "#AFC0D6", fontSize: ".74rem" }}>{item.category} · {item.municipality}, {item.island}</span>
        </article>
      ))}
    </div>
  );

  const renderOffers = (items: PublicOffer[]) => items.length > 0 && (
    <div style={{ display: "grid", gap: ".55rem" }}>
      <strong style={{ color: "#8EF0C8", fontSize: ".9rem" }}>Pessoas / empresas que oferecem ({items.length})</strong>
      {items.map((offer) => {
        const parent = requestById.get(offer.request_id);
        return (
          <article key={offer.id} style={{ padding: ".8rem", borderRadius: 10, border: "1px solid rgba(56,214,160,.32)", background: "rgba(6,78,59,.14)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: ".25rem" }}><span style={{ color: "#8EF0C8", fontSize: ".67rem", fontWeight: 850, letterSpacing: ".04em" }}>PROCURO &amp; OFEREÇO · PROPOSTA</span><strong>{offer.model}</strong></div>
              <strong style={{ color: "#8EF0C8" }}>{Number(offer.price_cve).toLocaleString("pt-PT")} CVE</strong>
            </div>
            <p style={{ margin: ".3rem 0", color: "#C2D0E3", fontSize: ".82rem", lineHeight: 1.45 }}>{offer.description}</p>
            <span style={{ color: "#AFC0D6", fontSize: ".74rem" }}>{offer.business_name}{parent ? ` · ${parent.municipality}, ${parent.island}` : ""}</span>
          </article>
        );
      })}
    </div>
  );

  return (
    <section aria-label="Resultados de Procuro e Ofereço" style={{ ...panelStyle, margin: "0 0 1.2rem", display: "grid", gap: ".85rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
        <div>
          <span style={{ color: "#75E8C0", fontSize: ".7rem", fontWeight: 850, letterSpacing: ".1em" }}>PESQUISA INTEGRADA</span>
          <h2 style={{ margin: ".25rem 0 0", fontSize: "1.12rem" }}>Também em Procuro &amp; Ofereço</h2>
        </div>
        <span style={{ color: "#AFC0D6", fontSize: ".8rem" }}>{loading ? "A pesquisar…" : `${total} resultado(s)`}</span>
      </div>
      {loading ? <p style={{ margin: 0, color: "#AFC0D6", fontSize: ".86rem" }}>A consultar pedidos e propostas públicos…</p> :
        error ? <p role="status" style={{ margin: 0, color: "#FCA5A5", fontSize: ".86rem" }}>{error}</p> :
        total === 0 ? <p style={{ margin: 0, color: "#AFC0D6", fontSize: ".86rem" }}>Não encontrámos pedidos ou propostas públicos com estes termos.</p> :
        <>
          {exactTotal > 0 && (
            <div style={{ display: "grid", gap: ".75rem" }}>
              <strong style={{ color: "#F8FAFC", fontSize: ".9rem" }}>Correspondências exatas ({exactTotal})</strong>
              {renderRequests(results.exactRequests)}
              {renderOffers(results.exactOffers)}
            </div>
          )}
          {relatedTotal > 0 && (
            <div style={{ display: "grid", gap: ".75rem", paddingTop: ".75rem", borderTop: "1px solid rgba(181,195,216,.18)" }}>
              <strong style={{ color: "#FCD34D", fontSize: ".9rem" }}>Alternativas relacionadas ({relatedTotal})</strong>
              {renderRequests(results.relatedRequests)}
              {renderOffers(results.relatedOffers)}
            </div>
          )}
        </>}
      <div>
        <button type="button" onClick={onOpenProcurement} style={{ border: "1px solid rgba(96,165,250,.45)", borderRadius: 9, padding: ".58rem .8rem", background: "#1E3A5F", color: "#DBEAFE", fontWeight: 750, cursor: "pointer" }}>
          Abrir Procuro &amp; Ofereço
        </button>
      </div>
    </section>
  );
}
