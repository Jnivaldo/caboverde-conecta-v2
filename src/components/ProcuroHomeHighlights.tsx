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
    [/^procuro\\b/i, "PROCURO"],
    [/^preciso\\s+de\\b/i, "PRECISO DE"],
    [/^necessito\\s+de\\b/i, "NECESSITO DE"],
    [/^procura[- ]se\\b/i, "PROCURA-SE"],
    [/^ofereço\\b/i, "OFEREÇO"],
    [/^disponível\\b/i, "DISPONÍVEL"],
    [/^vende[- ]se\\b/i, "VENDE-SE"],
    [/^arrenda[- ]se\\b/i, "ARRENDA-SE"],
    [/^aluga[- ]se\\b/i, "ALUGA-SE"],
  ];
  const match = rules.find(([pattern]) => pattern.test(title.trim()));
  if (!match) return { label: "PEDIDO", title };
  return { label: match[1], title: title.trim().replace(match[0], "").trim() };
}

export default function ProcuroHomeHighlights({ onOpen }: { onOpen: () => void }) {
  const [items, setItems] = useState<PublicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  if (loading || items.length === 0) return null;

  const item = items[activeIndex] ?? items[0];
  const highlight = getRequestHighlight(item.title);
  const palette = highlight.label === "OFEREÇO" || highlight.label === "DISPONÍVEL"
    ? { badge: "#047857", glow: "rgba(16,185,129,.18)", border: "rgba(52,211,153,.42)", surface: "linear-gradient(120deg,rgba(6,78,59,.42),rgba(7,11,24,.72))" }
    : highlight.label === "VENDE-SE" || highlight.label === "ARRRENDA-SE" || highlight.label === "ARRENDA-SE" || highlight.label === "ALUGA-SE"
    ? { badge: "#B45309", glow: "rgba(245,158,11,.18)", border: "rgba(251,191,36,.42)", surface: "linear-gradient(120deg,rgba(120,53,15,.42),rgba(7,11,24,.72))" }
    : highlight.label === "PRECISO DE" || highlight.label === "NECESSITO DE" || highlight.label === "PROCURA-SE" || highlight.label === "PROCURO"
    ? { badge: "#B91C1C", glow: "rgba(239,68,68,.2)", border: "rgba(248,113,113,.48)", surface: "linear-gradient(120deg,rgba(127,29,29,.42),rgba(7,11,24,.72))" }
    : { badge: "#1D4ED8", glow: "rgba(59,130,246,.18)", border: "rgba(96,165,250,.42)", surface: "linear-gradient(120deg,rgba(30,58,138,.4),rgba(7,11,24,.72))" };

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + items.length) % items.length);
  };

  return (
    <section
      aria-label="Pedidos Procuro & Ofereço em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
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

      <article key={item.id} aria-live="polite" style={{ minWidth: 0, padding: "clamp(1rem,3vw,1.4rem)", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, boxShadow: `0 12px 30px ${palette.glow}`, animation: "procuroSlideIn 1.05s cubic-bezier(.18,.78,.22,1) both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: ".28rem .62rem", borderRadius: 6, background: palette.badge, color: "#FFFFFF", fontSize: ".72rem", fontWeight: 900, letterSpacing: ".08em", boxShadow: "0 2px 8px rgba(185,28,28,.3)" }}>{highlight.label}</span>
          <span style={{ color: "#8EF0C8", fontSize: ".78rem", fontWeight: 750 }}>{item.category}</span>
          <span style={{ color: "#8FA2BD", fontSize: ".75rem" }}>{item.municipality}, {item.island}</span>
        </div>
        <h3 style={{ margin: ".8rem 0 .45rem", color: "#F8FAFC", fontSize: "clamp(1.18rem,2.8vw,1.55rem)", lineHeight: 1.3, fontWeight: 850 }}>{highlight.title || item.title}</h3>
        <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".9rem", lineHeight: 1.6, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden" }}>{item.description}</p>
        {item.budget && <strong style={{ display: "block", marginTop: ".65rem", color: "#F8FAFC", fontSize: ".88rem" }}>Orçamento: {item.budget}</strong>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".8rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button type="button" onClick={onOpen} style={{ padding: ".62rem .9rem", border: "1px solid rgba(147,197,253,.35)", borderRadius: 9, background: "rgba(37,99,235,.16)", color: "#BFDBFE", fontWeight: 800, cursor: "pointer" }}>Ver pedido e responder →</button>
          <span style={{ color: "#9AABC2", fontSize: ".78rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>Pedido {activeIndex + 1} de {items.length}</span>
        </div>
      </article>

      {items.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: ".85rem", marginTop: "1rem" }}>
          <button type="button" aria-label="Pedido anterior" onClick={() => move(-1)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(181,195,216,.28)", background: "rgba(255,255,255,.06)", color: "#F8FAFC", fontSize: "1.15rem", cursor: "pointer" }}>‹</button>
          <div style={{ display: "flex", alignItems: "center", gap: ".42rem" }}>
            {items.map((entry, index) => (
              <button key={entry.id} type="button" aria-label={`Mostrar pedido ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => setActiveIndex(index)} style={{ width: index === activeIndex ? 22 : 8, height: 8, padding: 0, border: 0, borderRadius: 99, background: index === activeIndex ? "#38D6A0" : "rgba(181,195,216,.42)", cursor: "pointer", transition: "all .2s ease" }} />
            ))}
          </div>
          <button type="button" aria-label="Próximo pedido" onClick={() => move(1)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(181,195,216,.28)", background: "rgba(255,255,255,.06)", color: "#F8FAFC", fontSize: "1.15rem", cursor: "pointer" }}>›</button>
        </div>
      )}
      <style>{`@keyframes procuroSlideIn { from { opacity: 0; transform: translateX(54px) scale(.975); filter: blur(2px); } to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); } } @media (prefers-reduced-motion: reduce) { article { animation: none !important; } }`}</style>
    </section>
  );
}
