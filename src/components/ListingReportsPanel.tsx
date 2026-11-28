import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Report = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  created_at: string;
  listings?: { title?: string | null } | null;
};

const reasonLabels: Record<string, string> = {
  fraude: "Suspeita de fraude",
  informacao_falsa: "Informação falsa",
  conteudo_inadequado: "Conteúdo inadequado",
  anuncio_duplicado: "Anúncio duplicado",
  outro: "Outro motivo",
};

const statusLabels: Record<Report["status"], string> = {
  pending: "Pendente",
  reviewed: "Analisada",
  dismissed: "Arquivada",
  action_taken: "Ação tomada",
};

export default function ListingReportsPanel({ canAdmin }: { canAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    if (!canAdmin) return;
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("listing_reports")
      .select("id, listing_id, reporter_id, reason, details, status, created_at, listings(title)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (queryError) setError("Não foi possível carregar as denúncias: " + queryError.message);
    else setReports((data ?? []) as Report[]);
    setLoading(false);
  }, [canAdmin]);

  useEffect(() => { if (open) void loadReports(); }, [loadReports, open]);
  if (!canAdmin) return null;

  const pending = reports.filter((report) => report.status === "pending").length;

  async function review(reportId: string, status: "reviewed" | "dismissed" | "action_taken") {
    if (busyId) return;
    setBusyId(reportId);
    setError("");
    const { error: reviewError } = await supabase.rpc("review_listing_report", {
      p_report_id: reportId,
      p_status: status,
    });
    if (reviewError) setError("Não foi possível atualizar a denúncia: " + reviewError.message);
    else await loadReports();
    setBusyId(null);
  }

  return (
    <section style={{ margin: "0 0 .85rem", border: "1px solid rgba(148,163,184,.22)", borderRadius: 12, background: "rgba(15,23,42,.5)", overflow: "hidden" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: ".7rem .85rem", border: 0, background: "transparent", color: "#E2E8F0", cursor: "pointer", textAlign: "left", fontWeight: 750 }}
      >
        <span>Denúncias de anúncios</span>
        <span style={{ display: "flex", alignItems: "center", gap: 9, color: pending ? "#FCD34D" : "#94A3B8", fontSize: ".78rem" }}>
          {pending} pendente(s) <span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
        </span>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid rgba(148,163,184,.16)", padding: ".75rem", display: "grid", gap: ".65rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#94A3B8", fontSize: ".76rem" }}>Últimas 50 denúncias recebidas</span>
            <button type="button" onClick={() => void loadReports()} disabled={loading} style={{ border: 0, background: "transparent", color: "#93C5FD", cursor: "pointer", fontSize: ".76rem" }}>Atualizar</button>
          </div>
          {error && <p role="alert" style={{ margin: 0, color: "#FCA5A5", fontSize: ".8rem" }}>{error}</p>}
          {loading ? <p style={{ margin: 0, color: "#94A3B8", fontSize: ".82rem" }}>A carregar…</p> :
            reports.length === 0 ? <p style={{ margin: 0, color: "#94A3B8", fontSize: ".82rem" }}>Ainda não existem denúncias.</p> :
            reports.map((report) => (
              <article key={report.id} style={{ padding: ".7rem", borderRadius: 9, border: "1px solid rgba(148,163,184,.16)", display: "grid", gap: ".35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ color: "#E2E8F0", fontSize: ".84rem" }}>{report.listings?.title || "Anúncio removido ou indisponível"}</strong>
                  <span style={{ color: report.status === "pending" ? "#FCD34D" : "#94A3B8", fontSize: ".72rem" }}>{statusLabels[report.status]}</span>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: ".79rem" }}>{reasonLabels[report.reason] || report.reason} · {new Date(report.created_at).toLocaleString("pt-PT")}</span>
                {report.details && <p style={{ margin: 0, color: "#94A3B8", fontSize: ".79rem", whiteSpace: "pre-wrap" }}>{report.details}</p>}
                {report.status === "pending" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: ".15rem" }}>
                    <button type="button" disabled={busyId === report.id} onClick={() => void review(report.id, "reviewed")} style={{ padding: ".35rem .55rem", borderRadius: 7, border: "1px solid rgba(96,165,250,.35)", background: "rgba(37,99,235,.12)", color: "#BFDBFE", fontSize: ".72rem", cursor: "pointer" }}>Analisada</button>
                    <button type="button" disabled={busyId === report.id} onClick={() => void review(report.id, "action_taken")} style={{ padding: ".35rem .55rem", borderRadius: 7, border: "1px solid rgba(52,211,153,.35)", background: "rgba(5,150,105,.12)", color: "#A7F3D0", fontSize: ".72rem", cursor: "pointer" }}>Ação tomada</button>
                    <button type="button" disabled={busyId === report.id} onClick={() => void review(report.id, "dismissed")} style={{ padding: ".35rem .55rem", borderRadius: 7, border: "1px solid rgba(148,163,184,.3)", background: "rgba(71,85,105,.16)", color: "#CBD5E1", fontSize: ".72rem", cursor: "pointer" }}>Arquivar</button>
                  </div>
                )}
              </article>
            ))}
        </div>
      )}
    </section>
  );
}
