import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type CampaignStatus = { used: number; total: number; remaining: number };
type Counts = { total: number; free: number; awaitingPayment: number; paid: number };

const card: React.CSSProperties = {
  border: "1px solid rgba(96,165,250,.3)",
  borderRadius: 14,
  padding: "1rem",
  background: "linear-gradient(145deg,#111D31,#10182A)",
  display: "grid",
  gap: ".45rem",
};
const muted: React.CSSProperties = { color: "#AFC0D6", fontSize: ".78rem", lineHeight: 1.5 };

export default function MonetizationPanel({ canAdmin }: { canAdmin: boolean }) {
  const [campaign, setCampaign] = useState<CampaignStatus | null>(null);
  const [counts, setCounts] = useState<Counts>({ total: 0, free: 0, awaitingPayment: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!canAdmin) return;
    setLoading(true);
    setError("");
    const [campaignResult, totalResult, freeResult, pendingResult, paidResult] = await Promise.all([
      supabase.rpc("get_launch_campaign_status"),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("payment_method", "free_launch"),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("payment_status", "confirmed").neq("payment_method", "free_launch"),
    ]);
    const failure = campaignResult.error || totalResult.error || freeResult.error || pendingResult.error || paidResult.error;
    if (failure) {
      setError("Não foi possível atualizar todos os indicadores: " + failure.message);
    } else {
      const status = campaignResult.data as CampaignStatus | null;
      setCampaign(status ? {
        used: Number(status.used ?? 0),
        total: Number(status.total ?? 50),
        remaining: Number(status.remaining ?? 0),
      } : null);
      setCounts({
        total: totalResult.count ?? 0,
        free: freeResult.count ?? 0,
        awaitingPayment: pendingResult.count ?? 0,
        paid: paidResult.count ?? 0,
      });
    }
    setLoading(false);
  }, [canAdmin]);

  useEffect(() => { void load(); }, [load]);

  if (!canAdmin) return null;
  const totalSlots = campaign?.total ?? 50;
  const usedSlots = Math.min(totalSlots, campaign?.used ?? 0);
  const remaining = campaign?.remaining ?? Math.max(0, totalSlots - usedSlots);
  const progress = totalSlots > 0 ? Math.min(100, (usedSlots / totalSlots) * 100) : 0;

  return (
    <section style={{ ...card, borderColor: "rgba(56,214,160,.38)", marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ".8rem", flexWrap: "wrap" }}>
        <div>
          <span style={{ color: "#38D6A0", fontSize: ".7rem", fontWeight: 900, letterSpacing: ".13em" }}>RECEITAS E MODELO COMERCIAL</span>
          <h2 style={{ margin: ".25rem 0", color: "#F8FAFC", fontSize: "1.3rem" }}>Monetização do marketplace</h2>
          <p style={{ ...muted, margin: 0 }}>Acompanhe a campanha gratuita e a preparação da cobrança por anúncio.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ border: "1px solid rgba(96,165,250,.4)", borderRadius: 9, padding: ".55rem .75rem", background: "#1D3557", color: "#DBEAFE", fontWeight: 800, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "A atualizar…" : "Atualizar indicadores"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: ".65rem" }}>
        {[
          { label: "Anúncios registados", value: counts.total, color: "#93C5FD" },
          { label: "Vagas gratuitas usadas", value: usedSlots + " / " + totalSlots, color: "#6EE7B7" },
          { label: "Vagas gratuitas restantes", value: remaining, color: "#FCD34D" },
          { label: "Pagamentos confirmados", value: counts.paid, color: "#C4B5FD" },
        ].map((item) => (
          <div key={item.label} style={{ border: "1px solid " + item.color, borderRadius: 11, padding: ".8rem", background: "rgba(7,15,29,.65)" }}>
            <div style={{ color: "#AFC0D6", fontSize: ".72rem", fontWeight: 750 }}>{item.label}</div>
            <strong style={{ display: "block", marginTop: ".25rem", color: item.color, fontSize: "1.45rem", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{item.value}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: ".4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", color: "#DCE7F5", fontSize: ".78rem", fontWeight: 750 }}>
          <span>Progresso das 50 vagas de lançamento</span><span>{Math.round(progress)}%</span>
        </div>
        <div role="progressbar" aria-label="Progresso da campanha gratuita" aria-valuemin={0} aria-valuemax={totalSlots} aria-valuenow={usedSlots} style={{ height: 10, borderRadius: 99, overflow: "hidden", background: "rgba(181,195,216,.14)" }}>
          <div style={{ width: progress + "%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#38D6A0,#60A5FA)", transition: "width .4s ease" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: ".65rem" }}>
        <div style={{ border: "1px solid rgba(56,214,160,.3)", borderRadius: 10, padding: ".8rem", background: "rgba(22,101,52,.12)" }}>
          <strong style={{ color: "#86EFAC", fontSize: ".86rem" }}>Campanha de lançamento</strong>
          <p style={{ ...muted, margin: ".3rem 0 0" }}>Os primeiros 50 anúncios recebem vaga gratuita. Pedidos e propostas em Procuro &amp; Ofereço continuam gratuitos.</p>
        </div>
        <div style={{ border: "1px solid rgba(96,165,250,.3)", borderRadius: 10, padding: ".8rem", background: "rgba(29,78,216,.1)" }}>
          <strong style={{ color: "#93C5FD", fontSize: ".86rem" }}>Tabela de preços</strong>
          <p style={{ margin: ".3rem 0 0", color: "#F8FAFC", fontSize: "1rem", fontWeight: 900 }}>Anúncio Normal: 1.500 CVE / 30 dias</p>
          <p style={{ margin: ".2rem 0 0", color: "#FDE68A", fontSize: "1rem", fontWeight: 900 }}>Anúncio Premium: 2.500 CVE / 30 dias</p>
          <p style={{ ...muted, margin: ".2rem 0 0" }}>Atualizar um anúncio Normal já publicado para Premium custa mais 1.000 CVE. Durante a campanha, os primeiros 50 anúncios Normais são gratuitos e a administração pode oferecer Premium gratuitamente a anúncios selecionados.</p>
        </div>
      </div>

      <div style={{ border: "1px solid rgba(250,204,21,.35)", borderRadius: 10, padding: ".8rem", background: "rgba(120,85,10,.12)" }}>
        <strong style={{ color: "#FDE68A", fontSize: ".82rem" }}>Validação manual de pagamentos</strong>
        <p style={{ ...muted, margin: ".25rem 0 0" }}>O código CVC serve apenas como referência da transferência, nunca como comprovativo. Confirme o crédito diretamente no banco antes de aprovar qualquer pedido. {counts.awaitingPayment} anúncio(s) com pagamento pendente.</p>
      </div>

      {error && <div role="alert" style={{ color: "#FCA5A5", fontSize: ".8rem" }}>{error}</div>}
      {loading && <p style={{ ...muted, margin: 0 }}>A carregar os indicadores financeiros…</p>}
    </section>
  );
}
