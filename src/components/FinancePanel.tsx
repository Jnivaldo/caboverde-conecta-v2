import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RevenuePeriod = {
  period_label: string;
  total_cve: number;
  transaction_count: number;
};

const formatCve = (value: number) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(value) + " CVE";

export default function FinancePanel({ canAdmin }: { canAdmin: boolean }) {
  const [rows, setRows] = useState<RevenuePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRevenue = useCallback(async () => {
    if (!canAdmin) return;
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("get_admin_revenue_summary");
    if (rpcError) {
      setError("Não foi possível carregar as receitas: " + rpcError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as RevenuePeriod[]);
    }
    setLoading(false);
  }, [canAdmin]);

  useEffect(() => {
    void loadRevenue();
  }, [loadRevenue]);

  if (!canAdmin) return null;

  return (
    <section aria-labelledby="finance-panel-title" style={{
      margin: "0 0 1.25rem", padding: "1.2rem", borderRadius: 18,
      border: "1px solid rgba(56,214,160,.34)",
      background: "linear-gradient(145deg, rgba(12,35,43,.96), rgba(17,31,52,.96))",
      boxShadow: "0 14px 34px rgba(0,0,0,.18)"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <span style={{ color: "#5EEAD4", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em" }}>CONTROLO FINANCEIRO</span>
          <h2 id="finance-panel-title" style={{ margin: "4px 0 3px", color: "#F8FAFC", fontSize: "1.3rem" }}>Receitas do CaboVerde Conecta</h2>
          <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".84rem" }}>Valores de pagamentos confirmados pela administração, em horário de Cabo Verde.</p>
        </div>
        <button type="button" onClick={() => void loadRevenue()} disabled={loading} style={{
          border: "1px solid rgba(148,163,184,.35)", borderRadius: 10, padding: "9px 13px",
          color: "#E2E8F0", background: "rgba(30,41,59,.75)", fontWeight: 750,
          cursor: loading ? "wait" : "pointer"
        }}>{loading ? "A atualizar…" : "Atualizar valores"}</button>
      </div>
      {error && <p role="alert" style={{ color: "#FCA5A5", fontSize: ".88rem" }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 12 }}>
        {["Hoje", "Esta semana", "Este mês"].map((period) => {
          const item = rows.find((row) => row.period_label === period);
          return (
            <article key={period} style={{
              minWidth: 0, padding: "1rem", borderRadius: 14,
              border: "1px solid rgba(148,163,184,.22)",
              background: "rgba(8,18,32,.58)"
            }}>
              <span style={{ color: "#AFC0D6", fontSize: ".82rem", fontWeight: 750 }}>{period}</span>
              <strong style={{ display: "block", margin: "8px 0 5px", color: "#6EE7B7", fontSize: "clamp(1.25rem, 2.5vw, 1.7rem)", lineHeight: 1.2 }}>
                {loading ? "—" : formatCve(Number(item?.total_cve ?? 0))}
              </strong>
              <span style={{ color: "#94A3B8", fontSize: ".78rem" }}>
                {loading ? "A carregar…" : `${Number(item?.transaction_count ?? 0)} pagamentos confirmados`}
              </span>
            </article>
          );
        })}
      </div>
      <p style={{ margin: "12px 0 0", color: "#94A3B8", fontSize: ".75rem", lineHeight: 1.45 }}>
        Os pedidos pendentes, códigos gerados e ofertas Premium gratuitas não entram neste total. A receita é contabilizada na data em que o pagamento é confirmado.
      </p>
    </section>
  );
}
