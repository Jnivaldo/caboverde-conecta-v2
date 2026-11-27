import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type PublicRequest = {
  id: string;
  title: string;
  category: string;
  island: string;
  municipality: string;
  description: string;
  budget: string | null;
  created_at: string;
};

function getRequestHighlight(title: string) {
  const rules: Array<[RegExp, string]> = [
    [/^procuro\b/i, "PROCURO"],
    [/^preciso\s+de\b/i, "PRECISO DE"],
    [/^necessito\s+de\b/i, "NECESSITO DE"],
    [/^procura[- ]se\b/i, "PROCURA-SE"],
    [/^ofereço\b/i, "OFEREÇO"],
    [/^disponível\b/i, "DISPONÍVEL"],
    [/^vende[- ]se\b/i, "VENDE-SE"],
    [/^arrenda[- ]se\b/i, "ARRENDA-SE"],
    [/^aluga[- ]se\b/i, "ALUGA-SE"],
  ];
  const match = rules.find(([pattern]) => pattern.test(title.trim()));
  if (!match) return { label: "PEDIDO", title };
  return { label: match[1], title: title.trim().replace(match[0], "").trim() };
}

const requestPalettes = [
  { badge: "#B91C1C", text: "#FCA5A5", border: "rgba(248,113,113,.55)", glow: "rgba(239,68,68,.2)", surface: "linear-gradient(120deg,rgba(127,29,29,.48),rgba(7,11,24,.76))" },
  { badge: "#0369A1", text: "#7DD3FC", border: "rgba(56,189,248,.55)", glow: "rgba(14,165,233,.2)", surface: "linear-gradient(120deg,rgba(7,89,133,.48),rgba(7,11,24,.76))" },
  { badge: "#047857", text: "#6EE7B7", border: "rgba(52,211,153,.55)", glow: "rgba(16,185,129,.2)", surface: "linear-gradient(120deg,rgba(6,78,59,.48),rgba(7,11,24,.76))" },
  { badge: "#6D28D9", text: "#C4B5FD", border: "rgba(167,139,250,.58)", glow: "rgba(139,92,246,.2)", surface: "linear-gradient(120deg,rgba(76,29,149,.48),rgba(7,11,24,.76))" },
  { badge: "#B45309", text: "#FCD34D", border: "rgba(251,191,36,.58)", glow: "rgba(245,158,11,.2)", surface: "linear-gradient(120deg,rgba(120,53,15,.48),rgba(7,11,24,.76))" },
  { badge: "#BE185D", text: "#F9A8D4", border: "rgba(244,114,182,.58)", glow: "rgba(236,72,153,.2)", surface: "linear-gradient(120deg,rgba(131,24,67,.48),rgba(7,11,24,.76))" },
  { badge: "#4D7C0F", text: "#BEF264", border: "rgba(163,230,53,.58)", glow: "rgba(132,204,22,.2)", surface: "linear-gradient(120deg,rgba(54,83,20,.48),rgba(7,11,24,.76))" },
];

export default function ProcuroHomeHighlights({ onOpen }: { onOpen: (requestId?: string) => void }) {
  const [items, setItems] = useState<PublicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("public_procurement_requests")
        .select("id,title,category,island,municipality,description,budget,created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!active) return;
      if (error) {
        console.error("Não foi possível carregar os pedidos em destaque:", error.message);
        setItems([]);
      } else {
        setItems((data ?? []) as PublicRequest[]);
      }
      setLoading(false);
    }
    void load();

    // Keep homepage highlights fresh when a request is approved while visitors
    // are browsing, without requiring a manual page refresh.
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const refreshOnFocus = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [activeIndex, items.length]);

  if (loading || items.length === 0) return null;

  const item = items[activeIndex] ?? items[0];
  const highlight = getRequestHighlight(item.title);
  // Cycle through a varied palette by slide position, so consecutive ads never look identical.
  const palette = requestPalettes[activeIndex % requestPalettes.length];

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + items.length) % items.length);
  };

  return (
    <section
      aria-label="Pedidos Procuro & Ofereço em destaque"
      style={{ margin: "0 auto 1.6rem", padding: "clamp(1rem, 2.5vw, 1.5rem)", borderRadius: 18, border: "1px solid rgba(56,214,160,.3)", background: "linear-gradient(135deg,#10182A 0%,#12243A 100%)", boxShadow: "0 14px 32px rgba(0,0,0,.16)", overflow: "hidden" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".8rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <span style={{ color: "#38D6A0", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".13em" }}>PROCURO & OFEREÇO</span>
          <h2 style={{ margin: ".25rem 0 0", color: "#F8FAFC", fontSize: "clamp(1.2rem,2.6vw,1.55rem)" }}>O que a comunidade procura e oferece</h2>
          <p style={{ margin: ".3rem 0 0", color: "#B5C3D8", fontSize: ".86rem" }}>Pedidos reais, aprovados pela nossa equipa.</p>
        </div>
        <button type="button" onClick={onOpen} style={{ border: "1px solid rgba(96,165,250,.45)", borderRadius: 10, padding: ".65rem .9rem", background: "#2563EB", color: "#fff", fontWeight: 750, cursor: "pointer" }}>Ver todos os pedidos</button>
      </div>

      <article key={item.id} aria-live="polite" style={{ minWidth: 0, padding: "clamp(1rem,3vw,1.4rem)", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, boxShadow: `0 12px 30px ${palette.glow}`, animation: "procuroSlideIn .24s ease-out both", willChange: "transform, opacity" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: ".28rem .62rem", borderRadius: 6, background: palette.badge, color: "#FFFFFF", fontSize: ".72rem", fontWeight: 900, letterSpacing: ".08em", boxShadow: `0 3px 12px ${palette.glow}` }}>{highlight.label}</span>
          <span style={{ color: "#8EF0C8", fontSize: ".78rem", fontWeight: 750 }}>{item.category}</span>
          <span style={{ color: "#8FA2BD", fontSize: ".75rem" }}>{item.municipality}, {item.island}</span>
        </div>
        <h3 style={{ margin: ".8rem 0 .45rem", color: palette.text, fontSize: "clamp(1.18rem,2.8vw,1.55rem)", lineHeight: 1.3, fontWeight: 850 }}>{highlight.title || item.title}</h3>
        <p style={{ margin: 0, color: "#D0D9E7", fontSize: ".9rem", lineHeight: 1.6, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden" }}>{item.description}</p>
        {item.budget && <strong style={{ display: "block", marginTop: ".65rem", color: "#F8FAFC", fontSize: ".88rem" }}>Orçamento: {item.budget}</strong>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".8rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button type="button" onClick={() => onOpen(item.id)} style={{ padding: ".62rem .9rem", border: `1px solid ${palette.border}`, borderRadius: 9, background: palette.glow, color: palette.text, fontWeight: 800, cursor: "pointer" }}>Ver pedido e responder →</button>
          <span style={{ color: "#9AABC2", fontSize: ".78rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>Pedido {activeIndex + 1} de {items.length}</span>
        </div>
      </article>

      {items.length > 1 && (
        <div className="procuro-carousel-controls" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: ".5rem", marginTop: ".75rem" }}>
          <button type="button" className="procuro-carousel-arrow" aria-label="Pedido anterior" onClick={() => move(-1)} style={{ width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(181,195,216,.28)", background: "rgba(255,255,255,.06)", color: "#F8FAFC", fontSize: ".9rem", cursor: "pointer" }}>‹</button>
          <div style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
            {items.map((entry, index) => (
              <button key={entry.id} type="button" className="procuro-carousel-dot" aria-label={`Mostrar pedido ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => setActiveIndex(index)} style={{ width: index === activeIndex ? 12 : 5, height: 5, padding: 0, border: 0, borderRadius: 99, background: index === activeIndex ? "#38D6A0" : "rgba(181,195,216,.42)", cursor: "pointer", transition: "all .15s ease" }} />
            ))}
          </div>
          <button type="button" className="procuro-carousel-arrow" aria-label="Próximo pedido" onClick={() => move(1)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(181,195,216,.28)", background: "rgba(255,255,255,.06)", color: "#F8FAFC", fontSize: "1.15rem", cursor: "pointer" }}>›</button>
        </div>
      )}
      <style>{`@keyframes procuroSlideIn { 0% { opacity: 0; transform: translate3d(6px,0,0); } 100% { opacity: 1; transform: translate3d(0,0,0); } }`}</style>
    </section>
  );
}
