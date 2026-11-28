import React, { useMemo, useState } from "react";

type Offer = {
  id: number;
  business: string;
  model: string;
  price: string;
  condition: string;
  description: string;
  photoUrl: string;
  whatsapp: string;
};
type RequestItem = {
  id: number;
  title: string;
  category: string;
  island: string;
  municipality: string;
  description: string;
  budget: string;
  createdAt: string;
  expiresAt: string;
  whatsapp: string;
  showWhatsapp: boolean;
  status: "Ativo" | "Em negociação" | "Concluído";
  offers: Offer[];
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
const btnStyle: React.CSSProperties = { border: 0, borderRadius: 10, padding: ".72rem .95rem", background: "#16A879", color: "#041B16", fontWeight: 850, cursor: "pointer" };
const cleanPhone = (value: string) => value.replace(/[^0-9]/g, "");

export default function ProcuroOfereco({ onOfferClick }: { onOfferClick: () => void }) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [island, setIsland] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [requestWhatsapp, setRequestWhatsapp] = useState("");
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [notice, setNotice] = useState("");
  const [activeOffer, setActiveOffer] = useState<number | null>(null);
  const [offerBusiness, setOfferBusiness] = useState("");
  const [offerModel, setOfferModel] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerCondition, setOfferCondition] = useState("Novo");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerPhoto, setOfferPhoto] = useState("");
  const [offerWhatsapp, setOfferWhatsapp] = useState("");
  const [offerNotice, setOfferNotice] = useState("");

  const visibleItems = useMemo(() => filter === "Todos" ? items : items.filter((item) => item.category === filter), [items, filter]);

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !category || !island || !municipality || !cleanDescription) return;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);
    setItems((current) => [{
      id: Date.now(), title: cleanTitle, category, island, municipality, description: cleanDescription,
      budget: budget.trim(), createdAt: now.toLocaleDateString("pt-PT"), expiresAt: expiry.toLocaleDateString("pt-PT"),
      whatsapp: cleanPhone(requestWhatsapp), showWhatsapp, status: "Ativo", offers: [],
    }, ...current]);
    setTitle(""); setCategory(""); setIsland(""); setMunicipality(""); setDescription(""); setBudget(""); setRequestWhatsapp(""); setShowWhatsapp(false);
    setNotice("Pedido adicionado apenas a esta demonstração. Ainda não foi publicado no servidor.");
  }

  function submitOffer(event: React.FormEvent<HTMLFormElement>, requestId: number) {
    event.preventDefault();
    if (!offerBusiness.trim() || !offerModel.trim() || !offerPrice.trim() || !offerDescription.trim() || !cleanPhone(offerWhatsapp)) return;
    const offer: Offer = {
      id: Date.now(), business: offerBusiness.trim(), model: offerModel.trim(), price: offerPrice.trim(),
      condition: offerCondition, description: offerDescription.trim(), photoUrl: offerPhoto.trim(), whatsapp: cleanPhone(offerWhatsapp),
    };
    setItems((current) => current.map((item) => item.id === requestId ? { ...item, offers: [offer, ...item.offers], status: "Em negociação" } : item));
    setActiveOffer(null); setOfferBusiness(""); setOfferModel(""); setOfferPrice(""); setOfferCondition("Novo");
    setOfferDescription(""); setOfferPhoto(""); setOfferWhatsapp("");
    setOfferNotice("Oferta adicionada à demonstração. O envio real e as notificações serão ligados ao servidor.");
  }

  function waLink(phone: string, message: string) {
    const number = cleanPhone(phone);
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
  }

  return (
    <section style={{ display: "grid", gap: "1.2rem" }}>
      <div style={{ padding: "clamp(1.2rem,3vw,2rem)", borderRadius: 18, border: "1px solid rgba(96,165,250,.3)", background: "linear-gradient(125deg,#10182A,#14233D 65%,#102A35)" }}>
        <span style={{ color: "#38D6A0", fontSize: ".74rem", fontWeight: 850, letterSpacing: ".14em" }}>LIGAÇÃO DIRETA ENTRE NECESSIDADES E OPORTUNIDADES</span>
        <h1 style={{ margin: ".45rem 0", fontSize: "clamp(1.8rem,5vw,2.7rem)", letterSpacing: "-.04em" }}>Procuro &amp; Ofereço</h1>
        <p style={{ margin: 0, maxWidth: 760, color: "#C2D0E3", lineHeight: 1.65 }}>Não encontrou o que procura? Publique um pedido gratuito. Tem o produto ou presta o serviço? Envie uma oferta e fale diretamente com quem procura.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".7rem", marginTop: "1.15rem" }}>
          <button type="button" onClick={() => document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ border: 0, borderRadius: 10, padding: ".75rem 1rem", background: "#2563EB", color: "white", fontWeight: 800, cursor: "pointer" }}>Publicar o que procuro</button>
          <button type="button" onClick={onOfferClick} style={{ border: "1px solid rgba(142,240,200,.55)", borderRadius: 10, padding: ".75rem 1rem", background: "rgba(56,214,160,.1)", color: "#8EF0C8", fontWeight: 800, cursor: "pointer" }}>Quero oferecer algo</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: ".8rem" }}>
        <div style={{ padding: "1rem", borderRadius: 14, border: "1px solid rgba(56,214,160,.28)", background: "#10182A" }}>
          <strong style={{ color: "#8EF0C8" }}>Procuro — gratuito</strong>
          <p style={{ margin: ".4rem 0 0", color: "#B5C3D8", fontSize: ".88rem", lineHeight: 1.5 }}>Qualquer pessoa pode publicar gratuitamente o que precisa e indicar onde está.</p>
        </div>
        <div style={{ padding: "1rem", borderRadius: 14, border: "1px solid rgba(96,165,250,.28)", background: "#10182A" }}>
          <strong style={{ color: "#93C5FD" }}>Ofereço — 1.500 CVE</strong>
          <p style={{ margin: ".4rem 0 0", color: "#B5C3D8", fontSize: ".88rem", lineHeight: 1.5 }}>As ofertas comerciais seguem a campanha das primeiras 50 publicações elegíveis gratuitas.</p>
        </div>
      </div>

      <div id="request-form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "1rem", alignItems: "start" }}>
        <form onSubmit={submitRequest} style={{ padding: "1.2rem", borderRadius: 16, border: "1px solid rgba(181,195,216,.2)", background: "#10182A", display: "grid", gap: ".85rem" }}>
          <div><span style={{ color: "#38D6A0", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em" }}>PEDIDO GRATUITO</span><h2 style={{ margin: ".25rem 0", fontSize: "1.35rem" }}>O que está à procura?</h2><p style={{ margin: 0, color: "#AFC0D6", fontSize: ".85rem" }}>Quanto mais detalhes fornecer, mais fácil será receber propostas relevantes.</p></div>
          <label style={labelStyle}>Título do pedido<input required maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Procuro televisor Vizio de 55 polegadas, novo" style={fieldStyle} /></label>
          <label style={labelStyle}>Categoria<select required value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}><option value="">Escolher categoria</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: ".65rem" }}>
            <label style={labelStyle}>Ilha<select required value={island} onChange={(e) => { setIsland(e.target.value); setMunicipality(""); }} style={fieldStyle}><option value="">Ilha</option>{Object.keys(islands).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label style={labelStyle}>Concelho<select required disabled={!island} value={municipality} onChange={(e) => setMunicipality(e.target.value)} style={fieldStyle}><option value="">Concelho</option>{(islands[island] || []).map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label style={labelStyle}>Descrição<textarea required maxLength={1500} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Marca, modelo, tamanho, estado, quantidade ou outras características..." style={{ ...fieldStyle, resize: "vertical" }} /></label>
          <label style={labelStyle}>Orçamento (opcional)<input value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={60} placeholder="Ex.: Até 50.000 CVE" style={fieldStyle} /></label>
          <label style={labelStyle}>WhatsApp para receber propostas (opcional)<input value={requestWhatsapp} onChange={(e) => setRequestWhatsapp(e.target.value)} maxLength={25} placeholder="Ex.: +238 9XX XX XX" style={fieldStyle} /></label>
          <label style={{ display: "flex", gap: ".6rem", alignItems: "flex-start", color: "#B5C3D8", fontSize: ".8rem", lineHeight: 1.45 }}>
            <input type="checkbox" checked={showWhatsapp} onChange={(e) => setShowWhatsapp(e.target.checked)} disabled={!requestWhatsapp.trim()} />
            Autorizo mostrar o meu WhatsApp neste pedido para contacto direto dos interessados.
          </label>
          <button type="submit" style={btnStyle}>Publicar pedido de demonstração</button>
          {notice && <p role="status" style={{ margin: 0, color: "#FCD34D", fontSize: ".8rem", lineHeight: 1.5 }}>{notice}</p>}
          <p style={{ margin: 0, color: "#8498B4", fontSize: ".75rem", lineHeight: 1.45 }}>Demonstração local: os pedidos não são guardados no servidor. Na versão definitiva, a publicação terá conta de utilizador, moderação e validade de 30 dias.</p>
        </form>

        <div style={{ padding: "1.2rem", borderRadius: 16, border: "1px solid rgba(181,195,216,.2)", background: "#10182A", minHeight: 260 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}><div><span style={{ color: "#60A5FA", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em" }}>MURAL DE PEDIDOS</span><h2 style={{ margin: ".25rem 0", fontSize: "1.35rem" }}>O que as pessoas procuram</h2></div><span style={{ color: "#AFC0D6", fontSize: ".8rem" }}>{items.length} pedido(s)</span></div>
          <select aria-label="Filtrar pedidos por categoria" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...fieldStyle, margin: ".75rem 0 1rem" }}><option>Todos</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          {offerNotice && <p role="status" style={{ color: "#FCD34D", fontSize: ".8rem" }}>{offerNotice}</p>}
          {visibleItems.length === 0 ? <div style={{ padding: "1.5rem .5rem", textAlign: "center", color: "#AFC0D6" }}><div style={{ fontSize: "2rem" }}>⌕</div><strong style={{ color: "#F8FAFC" }}>Ainda não há pedidos nesta demonstração</strong><p style={{ fontSize: ".84rem", lineHeight: 1.5 }}>Os pedidos publicados nesta sessão aparecem aqui para os fornecedores consultarem.</p></div> : <div style={{ display: "grid", gap: ".8rem" }}>{visibleItems.map((item) => <article key={item.id} style={{ padding: ".95rem", borderRadius: 12, border: "1px solid rgba(181,195,216,.16)", background: "#0B1425" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}><span style={{ color: "#8EF0C8", fontSize: ".74rem", fontWeight: 750 }}>{item.category}</span><span style={{ color: "#8498B4", fontSize: ".72rem" }}>{item.createdAt} · válido até {item.expiresAt}</span></div>
            <h3 style={{ margin: ".4rem 0", fontSize: "1.04rem" }}>{item.title}</h3>
            <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".85rem", lineHeight: 1.5 }}>{item.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap", marginTop: ".65rem", color: "#93A8C4", fontSize: ".76rem" }}><span>⌖ {item.municipality}, {item.island}</span><span style={{ color: item.status === "Ativo" ? "#8EF0C8" : "#FCD34D", fontWeight: 750 }}>{item.status}</span>{item.budget && <strong style={{ color: "#F8FAFC" }}>Orçamento: {item.budget}</strong>}</div>
            {item.showWhatsapp && item.whatsapp && <a href={waLink(item.whatsapp, `Olá! Vi o seu pedido "${item.title}" no CaboVerde Conecta e gostaria de apresentar uma proposta.`)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", marginTop: ".7rem", padding: ".55rem .75rem", borderRadius: 9, background: "#15803D", color: "white", textDecoration: "none", fontWeight: 750, fontSize: ".8rem" }}>Contactar quem procura pelo WhatsApp</a>}
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".8rem" }}>
              <button type="button" onClick={() => { setActiveOffer(activeOffer === item.id ? null : item.id); setOfferNotice(""); }} style={{ ...btnStyle, background: "#2563EB", color: "white" }}>Enviar uma oferta</button>
              {item.status !== "Concluído" && <button type="button" onClick={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "Concluído" } : entry))} style={{ border: "1px solid rgba(181,195,216,.25)", borderRadius: 9, padding: ".6rem .75rem", background: "transparent", color: "#B5C3D8", cursor: "pointer" }}>Marcar como concluído</button>}
            </div>
            {activeOffer === item.id && <form onSubmit={(event) => submitOffer(event, item.id)} style={{ marginTop: ".85rem", padding: ".9rem", borderRadius: 11, border: "1px solid rgba(96,165,250,.35)", background: "#111D31", display: "grid", gap: ".7rem" }}>
              <strong style={{ color: "#93C5FD" }}>Apresentar proposta para: {item.title}</strong>
              <label style={labelStyle}>Nome da empresa / fornecedor<input required value={offerBusiness} onChange={(e) => setOfferBusiness(e.target.value)} style={fieldStyle} placeholder="Nome comercial" /></label>
              <label style={labelStyle}>Marca e modelo<input required value={offerModel} onChange={(e) => setOfferModel(e.target.value)} style={fieldStyle} placeholder="Ex.: Vizio Smart TV 55”" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem" }}>
                <label style={labelStyle}>Preço (CVE)<input required value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} style={fieldStyle} placeholder="Ex.: 48.000" /></label>
                <label style={labelStyle}>Estado<select value={offerCondition} onChange={(e) => setOfferCondition(e.target.value)} style={fieldStyle}><option>Novo</option><option>Usado</option><option>Recondicionado</option></select></label>
              </div>
              <label style={labelStyle}>Descrição e condições<textarea required rows={3} value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} placeholder="Detalhes, garantia, entrega, disponibilidade..." /></label>
              <label style={labelStyle}>Fotografia do produto (URL, demonstração)<input value={offerPhoto} onChange={(e) => setOfferPhoto(e.target.value)} style={fieldStyle} placeholder="https://..." /></label>
              {offerPhoto.trim() && <img src={offerPhoto} alt="Pré-visualização do produto" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 9 }} />}
              <label style={labelStyle}>WhatsApp do fornecedor<input required value={offerWhatsapp} onChange={(e) => setOfferWhatsapp(e.target.value)} style={fieldStyle} placeholder="+238 ..." /></label>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}><button type="submit" style={btnStyle}>Adicionar oferta de demonstração</button><button type="button" onClick={() => setActiveOffer(null)} style={{ border: "1px solid rgba(181,195,216,.25)", borderRadius: 9, padding: ".6rem .75rem", background: "transparent", color: "#B5C3D8", cursor: "pointer" }}>Cancelar</button></div>
              <p style={{ margin: 0, color: "#8498B4", fontSize: ".73rem" }}>Nesta fase, a imagem é indicada por URL e a oferta fica apenas nesta sessão. O carregamento seguro de fotografias será ligado ao armazenamento quando existir ambiente de desenvolvimento.</p>
            </form>}
            {item.offers.length > 0 && <div style={{ display: "grid", gap: ".65rem", marginTop: ".9rem" }}><strong style={{ color: "#8EF0C8", fontSize: ".86rem" }}>{item.offers.length} proposta(s) recebida(s)</strong>{item.offers.map((offer) => <div key={offer.id} style={{ padding: ".8rem", borderRadius: 10, border: "1px solid rgba(56,214,160,.22)", background: "#10182A" }}>
              {offer.photoUrl && <img src={offer.photoUrl} alt={offer.model} style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 8, marginBottom: ".55rem" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}><strong>{offer.model}</strong><strong style={{ color: "#8EF0C8" }}>{offer.price} CVE</strong></div>
              <div style={{ color: "#AFC0D6", fontSize: ".78rem", marginTop: ".25rem" }}>{offer.business} · {offer.condition}</div>
              <p style={{ color: "#B5C3D8", fontSize: ".83rem", lineHeight: 1.45, margin: ".45rem 0" }}>{offer.description}</p>
              <a href={waLink(offer.whatsapp, `Olá! Vi a sua proposta para "${item.title}" no CaboVerde Conecta. Gostaria de saber mais.`)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", padding: ".5rem .7rem", borderRadius: 8, background: "#15803D", color: "white", textDecoration: "none", fontWeight: 750, fontSize: ".8rem" }}>Falar com o fornecedor no WhatsApp</a>
            </div>)}</div>}
          </article>)}</div>}
        </div>
      </div>
    </section>
  );
}
