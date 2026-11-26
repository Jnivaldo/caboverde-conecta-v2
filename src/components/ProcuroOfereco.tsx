import React, { useMemo, useState } from "react";

type RequestItem = {
  id: number;
  title: string;
  category: string;
  island: string;
  municipality: string;
  description: string;
  budget: string;
  createdAt: string;
};

const islands: Record<string, string[]> = {
  Santiago: ["Praia", "Tarrafal", "Assomada", "São Domingos", "Calheta de São Miguel"],
  "São Vicente": ["Mindelo", "Baía das Gatas", "São Pedro"],
  Sal: ["Espargos", "Santa Maria"],
  "Boa Vista": ["Sal Rei", "Rabil"],
  "Santo Antão": ["Porto Novo", "Ribeira Grande", "Paul"],
  "São Nicolau": ["Ribeira Brava", "Tarrafal de São Nicolau"],
  Fogo: ["São Filipe", "Mosteiros", "Santa Catarina do Fogo"],
  Maio: ["Vila do Maio"],
  Brava: ["Nova Sintra"],
};

const categories = ["Imóveis", "Viaturas", "Produtos", "Hospedagem", "Profissionais", "Empresas", "Serviços", "Turismo e Experiências", "Agricultura e Pecuária", "Máquinas e Equipamentos", "Desporto e Lazer", "Oportunidades", "Outro"];
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "0.78rem 0.85rem", borderRadius: 10, border: "1px solid rgba(181,195,216,.25)", background: "#0B1425", color: "#F8FAFC", fontSize: ".92rem", outlineColor: "#60A5FA" };
const labelStyle: React.CSSProperties = { display: "grid", gap: ".42rem", color: "#DCE7F5", fontSize: ".82rem", fontWeight: 700 };

export default function ProcuroOfereco({ onOfferClick }: { onOfferClick: () => void }) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [island, setIsland] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [notice, setNotice] = useState("");

  const visibleItems = useMemo(() => filter === "Todos" ? items : items.filter((item) => item.category === filter), [items, filter]);

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !category || !island || !municipality || !cleanDescription) return;
    setItems((current) => [{ id: Date.now(), title: cleanTitle, category, island, municipality, description: cleanDescription, budget: budget.trim(), createdAt: new Date().toLocaleDateString("pt-PT") }, ...current]);
    setTitle(""); setCategory(""); setIsland(""); setMunicipality(""); setDescription(""); setBudget("");
    setNotice("Pedido adicionado a esta pré-visualização. Ainda não foi enviado para o servidor.");
  }

  return (
    <section style={{ display: "grid", gap: "1.2rem" }}>
      <div style={{ padding: "clamp(1.2rem,3vw,2rem)", borderRadius: 18, border: "1px solid rgba(96,165,250,.3)", background: "linear-gradient(125deg,#10182A,#14233D 65%,#102A35)" }}>
        <span style={{ color: "#38D6A0", fontSize: ".74rem", fontWeight: 850, letterSpacing: ".14em" }}>LIGAÇÃO DIRETA ENTRE NECESSIDADES E OPORTUNIDADES</span>
        <h1 style={{ margin: ".45rem 0", fontSize: "clamp(1.8rem,5vw,2.7rem)", letterSpacing: "-.04em" }}>Procuro &amp; Ofereço</h1>
        <p style={{ margin: 0, maxWidth: 760, color: "#C2D0E3", lineHeight: 1.65 }}>Não encontrou o que procura? Publique um pedido gratuito. Tem algo para vender ou um serviço para oferecer? Divulgue no CaboVerde Conecta.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".7rem", marginTop: "1.15rem" }}>
          <button type="button" onClick={() => document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ border: 0, borderRadius: 10, padding: ".75rem 1rem", background: "#2563EB", color: "white", fontWeight: 800, cursor: "pointer" }}>Publicar o que procuro</button>
          <button type="button" onClick={onOfferClick} style={{ border: "1px solid rgba(142,240,200,.55)", borderRadius: 10, padding: ".75rem 1rem", background: "rgba(56,214,160,.1)", color: "#8EF0C8", fontWeight: 800, cursor: "pointer" }}>Quero oferecer algo</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: ".8rem" }}>
        <div style={{ padding: "1rem", borderRadius: 14, border: "1px solid rgba(56,214,160,.28)", background: "#10182A" }}>
          <strong style={{ color: "#8EF0C8" }}>Procuro — gratuito</strong>
          <p style={{ margin: ".4rem 0 0", color: "#B5C3D8", fontSize: ".88rem", lineHeight: 1.5 }}>Pedidos publicados sem custo para quem procura produtos, imóveis, viaturas ou serviços.</p>
        </div>
        <div style={{ padding: "1rem", borderRadius: 14, border: "1px solid rgba(96,165,250,.28)", background: "#10182A" }}>
          <strong style={{ color: "#93C5FD" }}>Ofereço — 1.500 CVE</strong>
          <p style={{ margin: ".4rem 0 0", color: "#B5C3D8", fontSize: ".88rem", lineHeight: 1.5 }}>Anúncios de oferta. As primeiras 50 publicações elegíveis mantêm a campanha gratuita.</p>
        </div>
      </div>

      <div id="request-form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "1rem", alignItems: "start" }}>
        <form onSubmit={submitRequest} style={{ padding: "1.2rem", borderRadius: 16, border: "1px solid rgba(181,195,216,.2)", background: "#10182A", display: "grid", gap: ".85rem" }}>
          <div><span style={{ color: "#38D6A0", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em" }}>PEDIDO GRATUITO</span><h2 style={{ margin: ".25rem 0", fontSize: "1.35rem" }}>O que está à procura?</h2><p style={{ margin: 0, color: "#AFC0D6", fontSize: ".85rem" }}>Descreva o que precisa para que potenciais fornecedores possam encontrar o seu pedido.</p></div>
          <label style={labelStyle}>Título do pedido<input required maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Procuro apartamento T2 na Praia" style={fieldStyle} /></label>
          <label style={labelStyle}>Categoria<select required value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}><option value="">Escolher categoria</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: ".65rem" }}>
            <label style={labelStyle}>Ilha<select required value={island} onChange={(e) => { setIsland(e.target.value); setMunicipality(""); }} style={fieldStyle}><option value="">Ilha</option>{Object.keys(islands).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label style={labelStyle}>Concelho<select required disabled={!island} value={municipality} onChange={(e) => setMunicipality(e.target.value)} style={fieldStyle}><option value="">Concelho</option>{(islands[island] || []).map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label style={labelStyle}>Descrição<textarea required maxLength={1500} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explique o que procura, características, quantidade ou condições..." style={{ ...fieldStyle, resize: "vertical" }} /></label>
          <label style={labelStyle}>Orçamento (opcional)<input value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={60} placeholder="Ex.: Até 50.000 CVE" style={fieldStyle} /></label>
          <button type="submit" style={{ border: 0, borderRadius: 10, padding: ".85rem 1rem", background: "#16A879", color: "#041B16", fontWeight: 900, cursor: "pointer" }}>Adicionar pedido à pré-visualização</button>
          {notice && <p role="status" style={{ margin: 0, color: "#FCD34D", fontSize: ".8rem", lineHeight: 1.5 }}>{notice}</p>}
          <p style={{ margin: 0, color: "#8498B4", fontSize: ".75rem", lineHeight: 1.45 }}>Nesta primeira etapa, os pedidos ficam apenas nesta sessão de demonstração. A publicação definitiva, contacto e moderação serão ligados ao servidor após a migração da base de dados.</p>
        </form>

        <div style={{ padding: "1.2rem", borderRadius: 16, border: "1px solid rgba(181,195,216,.2)", background: "#10182A", minHeight: 260 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}><div><span style={{ color: "#60A5FA", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em" }}>MURAL DE PEDIDOS</span><h2 style={{ margin: ".25rem 0", fontSize: "1.35rem" }}>O que as pessoas procuram</h2></div><span style={{ color: "#AFC0D6", fontSize: ".8rem" }}>{items.length} pedido(s)</span></div>
          <select aria-label="Filtrar pedidos por categoria" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...fieldStyle, margin: ".75rem 0 1rem" }}><option>Todos</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          {visibleItems.length === 0 ? <div style={{ padding: "1.5rem .5rem", textAlign: "center", color: "#AFC0D6" }}><div style={{ fontSize: "2rem" }}>⌕</div><strong style={{ color: "#F8FAFC" }}>Ainda não há pedidos nesta pré-visualização</strong><p style={{ fontSize: ".84rem", lineHeight: 1.5 }}>Quando forem publicados pedidos, aparecerão aqui para os fornecedores consultarem.</p></div> : <div style={{ display: "grid", gap: ".7rem" }}>{visibleItems.map((item) => <article key={item.id} style={{ padding: ".9rem", borderRadius: 12, border: "1px solid rgba(181,195,216,.16)", background: "#0B1425" }}><div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}><span style={{ color: "#8EF0C8", fontSize: ".74rem", fontWeight: 750 }}>{item.category}</span><span style={{ color: "#8498B4", fontSize: ".72rem" }}>{item.createdAt}</span></div><h3 style={{ margin: ".35rem 0", fontSize: "1rem" }}>{item.title}</h3><p style={{ margin: 0, color: "#B5C3D8", fontSize: ".85rem", lineHeight: 1.5 }}>{item.description}</p><div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap", marginTop: ".65rem", color: "#93A8C4", fontSize: ".76rem" }}><span>{item.municipality}, {item.island}</span>{item.budget && <strong style={{ color: "#F8FAFC" }}>Orçamento: {item.budget}</strong>}</div></article>)}</div>}
        </div>
      </div>
    </section>
  );
}
