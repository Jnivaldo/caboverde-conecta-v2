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

export default function ProcuroHomeHighlights({ onOpen }: { onOpen: () => void }) {
  const [items, setItems] = useState<PublicRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("public_procurement_requests")
        .select("id,title,category,island,municipality,description,budget,created_at")
        .order("created_at", { ascending: false })
        .limit(3);
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

  if (loading || items.length === 0) return null;

  return (
    <section aria-label="Pedidos Procuro & Ofereço em destaque" style={{ margin: "0 auto 1.6rem", padding: "clamp(1rem, 2.5vw, 1.35rem)", borderRadius: 18, border: "1px solid rgba(56,214,160,.28)", background: "linear-gradient(135deg,#10182A 0%,#12243A 100%)", boxShadow: "0 14px 32px rgba(0,0,0,.16)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".8rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <span style={{ color: "#38D6A0", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".13em" }}>PROCURO & OFEREÇO</span>
          <h2 style={{ margin: ".25rem 0 0", color: "#F8FAFC", fontSize: "clamp(1.2rem,2.6vw,1.55rem)" }}>O que as pessoas procuram</h2>
          <p style={{ margin: ".3rem 0 0", color: "#B5C3D8", fontSize: ".86rem" }}>Pedidos recentes aprovados pela nossa equipa.</p>
        </div>
        <button type="button" onClick={onOpen} style={{ border: "1px solid rgba(96,165,250,.45)", borderRadius: 10, padding: ".65rem .9rem", background: "#2563EB", color: "#fff", fontWeight: 750, cursor: "pointer" }}>Ver todos os pedidos</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))", gap: ".75rem" }}>
        {items.map((item) => (
          <article key={item.id} style={{ minWidth: 0, padding: ".95rem", borderRadius: 13, border: "1px solid rgba(181,195,216,.16)", background: "rgba(7,11,24,.48)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
              <span style={{ color: "#8EF0C8", fontSize: ".74rem", fontWeight: 750 }}>{item.category}</span>
              <span style={{ color: "#8FA2BD", fontSize: ".72rem" }}>{item.municipality}, {item.island}</span>
            </div>
            <h3 style={{ margin: ".55rem 0 .4rem", color: "#F8FAFC", fontSize: "1.08rem", lineHeight: 1.35, fontWeight: 850, display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".42rem" }}>{/^procuro\b/i.test(item.title) ? <><span style={{ display: "inline-flex", alignItems: "center", padding: ".18rem .48rem", borderRadius: 6, background: "#B91C1C", color: "#FFFFFF", fontSize: ".72rem", fontWeight: 900, letterSpacing: ".08em", boxShadow: "0 2px 8px rgba(185,28,28,.3)" }}>PROCURO</span><span>{item.title.replace(/^procuro\s*/i, "")}</span></> : item.title}</h3>
            <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".82rem", lineHeight: 1.5, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>{item.description}</p>
            {item.budget && <strong style={{ display: "block", marginTop: ".55rem", color: "#F8FAFC", fontSize: ".82rem" }}>Orçamento: {item.budget}</strong>}
            <button type="button" onClick={onOpen} style={{ marginTop: ".75rem", padding: 0, border: 0, background: "transparent", color: "#93C5FD", fontWeight: 750, cursor: "pointer" }}>Ver pedido e responder →</button>
          </article>
        ))}
      </div>
    </section>
  );
}
