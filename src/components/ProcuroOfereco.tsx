import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type RequestRow = {
  id: string; requester_id?: string; title: string; category: string; island: string;
  municipality: string; description: string; budget: string | null; requester_whatsapp: string | null;
  show_whatsapp: boolean; status: "active" | "negotiating" | "completed";
  moderation_status?: "pending" | "approved" | "rejected"; expires_at: string; created_at: string;
};
type OfferRow = {
  id: string; request_id: string; supplier_id?: string; business_name: string; model: string;
  price_cve: number; condition: "new" | "used" | "refurbished"; description: string;
  photo_url: string | null; supplier_whatsapp: string; moderation_status?: "pending" | "approved" | "rejected";
  created_at: string;
};
type Props = { user: User | null; canAdmin: boolean; onAuthClick: () => void };

const islands: Record<string, string[]> = {
  Santiago: ["Praia", "Tarrafal", "Assomada", "São Domingos", "Calheta de São Miguel"],
  "São Vicente": ["Mindelo", "Baía das Gatas", "São Pedro"], Sal: ["Espargos", "Santa Maria"],
  "Boa Vista": ["Sal Rei", "Rabil"], "Santo Antão": ["Porto Novo", "Ribeira Grande", "Paul"],
  "São Nicolau": ["Ribeira Brava", "Tarrafal de São Nicolau"], Fogo: ["São Filipe", "Mosteiros", "Santa Catarina do Fogo"],
  Maio: ["Vila do Maio"], Brava: ["Nova Sintra"],
};
const categories = ["Imóveis", "Viaturas", "Produtos", "Hospedagem", "Profissionais", "Empresas", "Serviços", "Turismo e Experiências", "Agricultura e Pecuária", "Máquinas e Equipamentos", "Desporto e Lazer", "Oportunidades", "Outro"];
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: ".78rem .85rem", borderRadius: 10, border: "1px solid rgba(181,195,216,.25)", background: "#0B1425", color: "#F8FAFC", fontSize: ".92rem", outlineColor: "#60A5FA" };
const labelStyle: React.CSSProperties = { display: "grid", gap: ".42rem", color: "#DCE7F5", fontSize: ".82rem", fontWeight: 700 };
const btnStyle: React.CSSProperties = { border: 0, borderRadius: 10, padding: ".72rem .95rem", background: "#16A879", color: "#041B16", fontWeight: 850, cursor: "pointer" };
const cleanPhone = (value: string) => value.replace(/[^0-9]/g, "");
const errorText = (error: unknown) => error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
const dateText = (value: string) => new Date(value).toLocaleDateString("pt-PT");
const statusLabel = (value: RequestRow["status"]) => value === "completed" ? "Concluído" : value === "negotiating" ? "Em negociação" : "Ativo";
const moderationLabel = (value?: string) => value === "approved" ? "Publicado" : value === "rejected" ? "Rejeitado" : "A aguardar aprovação";

export default function ProcuroOfereco({ user, canAdmin, onAuthClick }: Props) {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
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
  const [activeOffer, setActiveOffer] = useState<string | null>(null);
  const [offerBusiness, setOfferBusiness] = useState("");
  const [offerModel, setOfferModel] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerCondition, setOfferCondition] = useState<"new" | "used" | "refurbished">("new");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerPhoto, setOfferPhoto] = useState("");
  const [offerWhatsapp, setOfferWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let requestData: RequestRow[] = [];
      let offerData: OfferRow[] = [];
      if (user) {
        const [requestResult, offerResult] = await Promise.all([
          supabase.from("procurement_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("procurement_offers").select("*").order("created_at", { ascending: false }),
        ]);
        if (requestResult.error) throw requestResult.error;
        if (offerResult.error) throw offerResult.error;
        requestData = (requestResult.data ?? []) as RequestRow[];
        offerData = (offerResult.data ?? []) as OfferRow[];
      } else {
        const [requestResult, offerResult] = await Promise.all([
          supabase.from("public_procurement_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("public_procurement_offers").select("*").order("created_at", { ascending: false }),
        ]);
        if (requestResult.error) throw requestResult.error;
        if (offerResult.error) throw offerResult.error;
        requestData = (requestResult.data ?? []) as RequestRow[];
        offerData = (offerResult.data ?? []) as OfferRow[];
      }
      setItems(requestData);
      setOffers(offerData);
      setNotice("");
    } catch (error) {
      setNotice("Não foi possível carregar os pedidos do servidor: " + errorText(error));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadData(); }, [loadData]);

  const visibleItems = useMemo(() => {
    const active = items.filter((item) => item.status !== "completed" && new Date(item.expires_at) > new Date());
    return filter === "Todos" ? active : active.filter((item) => item.category === filter);
  }, [items, filter]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setNotice("Entre na sua conta para publicar um pedido. O pedido continua gratuito."); onAuthClick(); return; }
    if (busy) return;
    const cleanTitle = title.trim(), cleanDescription = description.trim();
    if (cleanTitle.length < 5 || cleanDescription.length < 10) {
      setNotice("O título deve ter pelo menos 5 caracteres e a descrição pelo menos 10."); return;
    }
    if (showWhatsapp && !cleanPhone(requestWhatsapp)) {
      setNotice("Indique um WhatsApp válido ou retire a autorização de divulgação."); return;
    }
    setBusy(true); setNotice("");
    const { data, error } = await supabase.from("procurement_requests").insert({
      requester_id: user.id, title: cleanTitle, category, island, municipality,
      description: cleanDescription, budget: budget.trim() || null,
      requester_whatsapp: cleanPhone(requestWhatsapp) || null, show_whatsapp: showWhatsapp,
    }).select("*").single();
    setBusy(false);
    if (error) { setNotice("Não foi possível publicar o pedido: " + error.message); return; }
    setTitle(""); setCategory(""); setIsland(""); setMunicipality(""); setDescription("");
    setBudget(""); setRequestWhatsapp(""); setShowWhatsapp(false);
    setNotice("Pedido recebido no servidor. Está pendente de moderação e ficará visível aos fornecedores após aprovação.");
    await loadData();
  }

  async function submitOffer(event: React.FormEvent<HTMLFormElement>, requestId: string) {
    event.preventDefault();
    if (!user) { setNotice("Entre na sua conta para apresentar uma proposta."); onAuthClick(); return; }
    if (busy) return;
    const price = Number(offerPrice.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) { setNotice("Indique um preço válido em CVE."); return; }
    if (offerPhoto.trim()) {
      try { if (new URL(offerPhoto.trim()).protocol !== "https:") throw new Error(); }
      catch { setNotice("A fotografia deve utilizar um endereço HTTPS válido."); return; }
    }
    setBusy(true); setNotice("");
    const { error } = await supabase.from("procurement_offers").insert({
      request_id: requestId, supplier_id: user.id, business_name: offerBusiness.trim(),
      model: offerModel.trim(), price_cve: price, condition: offerCondition,
      description: offerDescription.trim(), photo_url: offerPhoto.trim() || null,
      supplier_whatsapp: cleanPhone(offerWhatsapp),
    });
    setBusy(false);
    if (error) { setNotice("Não foi possível enviar a proposta: " + error.message); return; }
    setActiveOffer(null); setOfferBusiness(""); setOfferModel(""); setOfferPrice("");
    setOfferCondition("new"); setOfferDescription(""); setOfferPhoto(""); setOfferWhatsapp("");
    setNotice("Proposta recebida no servidor. Será apresentada depois da moderação.");
    await loadData();
  }

  async function updateRequestStatus(item: RequestRow, status: RequestRow["status"]) {
    if (!user || (item.requester_id !== user.id && !canAdmin)) return;
    const { error } = await supabase.from("procurement_requests").update({ status }).eq("id", item.id);
    if (error) { setNotice("Não foi possível atualizar o pedido: " + error.message); return; }
    await loadData();
  }

  async function moderateRequest(id: string, decision: "approved" | "rejected") {
    if (!canAdmin) return;
    const { error } = await supabase.from("procurement_requests").update({ moderation_status: decision }).eq("id", id);
    if (error) { setNotice("Não foi possível moderar o pedido: " + error.message); return; }
    setNotice(decision === "approved" ? "Pedido aprovado e publicado." : "Pedido rejeitado.");
    await loadData();
  }

  async function moderateOffer(id: string, decision: "approved" | "rejected") {
    if (!canAdmin) return;
    const { error } = await supabase.from("procurement_offers").update({ moderation_status: decision }).eq("id", id);
    if (error) { setNotice("Não foi possível moderar a proposta: " + error.message); return; }
    setNotice(decision === "approved" ? "Proposta aprovada." : "Proposta rejeitada.");
    await loadData();
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
        <p style={{ margin: 0, maxWidth: 760, color: "#C2D0E3", lineHeight: 1.65 }}>Não encontrou o que procura? Publique um pedido gratuito. Tem o produto ou presta o serviço? Envie uma proposta e fale diretamente com quem procura.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".7rem", marginTop: "1.15rem" }}>
          <button type="button" onClick={() => document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ ...btnStyle, background: "#2563EB", color: "white" }}>Publicar o que procuro</button>
          <span style={{ alignSelf: "center", color: "#AFC0D6", fontSize: ".82rem" }}>Pedidos gratuitos · validade de 30 dias</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: ".8rem" }}>
        <div style={{ padding: "1rem", borderRadius: 14, border: "1px solid rgba(56,214,160,.28)", background: "#10182A" }}>
          <strong style={{ color: "#8EF0C8" }}>Procuro — gratuito</strong>
          <p style={{ margin: ".4rem 0 0", color: "#B5C3D8", fontSize: ".88rem", lineHeight: 1.5 }}>Qualquer pessoa pode publicar gratuitamente o que precisa e indicar onde está.</p>
        </div>
        <div style={{ padding: "1rem", borderRadius: 14, border: "1px solid rgba(96,165,250,.28)", background: "#10182A" }}>
          <strong style={{ color: "#93C5FD" }}>Ofereço — propostas gratuitas</strong>
          <p style={{ margin: ".4rem 0 0", color: "#B5C3D8", fontSize: ".88rem", lineHeight: 1.5 }}>Responder a um pedido não é um anúncio pago. A publicação de propostas depende de moderação.</p>
        </div>
      </div>

      {notice && <div role="status" style={{ padding: ".85rem 1rem", borderRadius: 11, border: "1px solid rgba(96,165,250,.35)", background: "#14233D", color: "#DCE7F5", fontSize: ".86rem", lineHeight: 1.5 }}>{notice}</div>}

      <div id="request-form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "1rem", alignItems: "start" }}>
        <form onSubmit={submitRequest} style={{ padding: "1.2rem", borderRadius: 16, border: "1px solid rgba(181,195,216,.2)", background: "#10182A", display: "grid", gap: ".85rem" }}>
          <div><span style={{ color: "#38D6A0", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em" }}>PEDIDO GRATUITO</span><h2 style={{ margin: ".25rem 0", fontSize: "1.35rem" }}>O que está à procura?</h2><p style={{ margin: 0, color: "#AFC0D6", fontSize: ".85rem" }}>O pedido é guardado na sua conta e fica pendente de aprovação antes de aparecer publicamente.</p></div>
          <label style={labelStyle}>Título do pedido<input required minLength={5} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Procuro televisor Vizio de 55 polegadas, novo" style={fieldStyle} /></label>
          <label style={labelStyle}>Categoria<select required value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}><option value="">Escolher categoria</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: ".65rem" }}>
            <label style={labelStyle}>Ilha<select required value={island} onChange={(e) => { setIsland(e.target.value); setMunicipality(""); }} style={fieldStyle}><option value="">Ilha</option>{Object.keys(islands).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label style={labelStyle}>Concelho<select required disabled={!island} value={municipality} onChange={(e) => setMunicipality(e.target.value)} style={fieldStyle}><option value="">Concelho</option>{(islands[island] || []).map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label style={labelStyle}>Descrição<textarea required minLength={10} maxLength={2000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Marca, modelo, tamanho, estado, quantidade ou outras características..." style={{ ...fieldStyle, resize: "vertical" }} /></label>
          <label style={labelStyle}>Orçamento (opcional)<input value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={80} placeholder="Ex.: Até 50.000 CVE" style={fieldStyle} /></label>
          <label style={labelStyle}>WhatsApp para receber propostas (opcional)<input value={requestWhatsapp} onChange={(e) => setRequestWhatsapp(e.target.value)} maxLength={25} placeholder="Ex.: +238 9XX XX XX" style={fieldStyle} /></label>
          <label style={{ display: "flex", gap: ".6rem", alignItems: "flex-start", color: "#B5C3D8", fontSize: ".8rem", lineHeight: 1.45 }}>
            <input type="checkbox" checked={showWhatsapp} onChange={(e) => setShowWhatsapp(e.target.checked)} disabled={!requestWhatsapp.trim()} />
            Autorizo mostrar o meu WhatsApp neste pedido para contacto direto dos interessados.
          </label>
          <button type="submit" disabled={busy || !user} style={{ ...btnStyle, opacity: busy || !user ? .65 : 1 }}>{busy ? "A publicar..." : !user ? "Entre na sua conta para publicar" : "Publicar pedido gratuito"}</button>
          {!user && <button type="button" onClick={onAuthClick} style={{ ...btnStyle, background: "#2563EB", color: "white" }}>Entrar / Criar conta</button>}
          <p style={{ margin: 0, color: "#8498B4", fontSize: ".75rem", lineHeight: 1.45 }}>Os pedidos ficam associados à sua conta, são moderados e expiram automaticamente após 30 dias.</p>
        </form>

        <div style={{ padding: "1.2rem", borderRadius: 16, border: "1px solid rgba(181,195,216,.2)", background: "#10182A", minHeight: 260 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}><div><span style={{ color: "#60A5FA", fontSize: ".72rem", fontWeight: 850, letterSpacing: ".12em" }}>MURAL DE PEDIDOS</span><h2 style={{ margin: ".25rem 0", fontSize: "1.35rem" }}>O que as pessoas procuram</h2></div><span style={{ color: "#AFC0D6", fontSize: ".8rem" }}>{visibleItems.length} pedido(s)</span></div>
          <select aria-label="Filtrar pedidos por categoria" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...fieldStyle, margin: ".75rem 0 1rem" }}><option>Todos</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          {loading ? <p style={{ color: "#AFC0D6" }}>A carregar pedidos publicados...</p> : visibleItems.length === 0 ? <div style={{ padding: "1.5rem .5rem", textAlign: "center", color: "#AFC0D6" }}><div style={{ fontSize: "2rem" }}>⌕</div><strong style={{ color: "#F8FAFC" }}>Ainda não há pedidos publicados nesta categoria</strong><p style={{ fontSize: ".84rem", lineHeight: 1.5 }}>Quando um pedido for aprovado, ficará disponível aqui para os fornecedores.</p></div> : <div style={{ display: "grid", gap: ".8rem" }}>{visibleItems.map((item) => {
            const itemOffers = offers.filter((offer) => offer.request_id === item.id);
            const isOwner = !!user && item.requester_id === user.id;
            return <article key={item.id} style={{ padding: ".95rem", borderRadius: 12, border: "1px solid rgba(181,195,216,.16)", background: "#0B1425" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}><span style={{ color: "#8EF0C8", fontSize: ".74rem", fontWeight: 750 }}>{item.category}</span><span style={{ color: "#8498B4", fontSize: ".72rem" }}>{dateText(item.created_at)} · válido até {dateText(item.expires_at)}</span></div>
              <h3 style={{ margin: ".5rem 0 .4rem", fontSize: "1.1rem", lineHeight: 1.35, fontWeight: 850, display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".45rem" }}>{/^procuro\b/i.test(item.title) ? <><span style={{ display: "inline-flex", alignItems: "center", padding: ".2rem .52rem", borderRadius: 6, background: "#B91C1C", color: "#FFFFFF", fontSize: ".73rem", fontWeight: 900, letterSpacing: ".08em", boxShadow: "0 2px 8px rgba(185,28,28,.3)" }}>PROCURO</span><span>{item.title.replace(/^procuro\s*/i, "")}</span></> : item.title}</h3>
              <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".85rem", lineHeight: 1.5 }}>{item.description}</p>
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap", marginTop: ".65rem", color: "#93A8C4", fontSize: ".76rem" }}><span>⌖ {item.municipality}, {item.island}</span><span style={{ color: item.status === "completed" ? "#FCD34D" : "#8EF0C8", fontWeight: 750 }}>{statusLabel(item.status)}</span>{item.budget && <strong style={{ color: "#F8FAFC" }}>Orçamento: {item.budget}</strong>}</div>
              {item.moderation_status === "pending" && <p style={{ color: "#FCD34D", fontSize: ".78rem", margin: ".65rem 0 0" }}>Pedido recebido · {moderationLabel(item.moderation_status)}. Só o titular e a administração o podem ver nesta fase.</p>}
              {item.moderation_status === "rejected" && <p style={{ color: "#FDA4AF", fontSize: ".78rem", margin: ".65rem 0 0" }}>Este pedido foi rejeitado pela moderação.</p>}
              {item.show_whatsapp && item.requester_whatsapp && <a href={waLink(item.requester_whatsapp, `Olá! Vi o seu pedido "${item.title}" no CaboVerde Conecta e gostaria de apresentar uma proposta.`)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", marginTop: ".7rem", padding: ".55rem .75rem", borderRadius: 9, background: "#15803D", color: "white", textDecoration: "none", fontWeight: 750, fontSize: ".8rem" }}>Contactar quem procura pelo WhatsApp</a>}
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".8rem" }}>
                {item.moderation_status === "approved" && item.status !== "completed" && !isOwner && <button type="button" onClick={() => { if (!user) { setNotice("Entre na sua conta para apresentar uma proposta."); onAuthClick(); return; } setActiveOffer(activeOffer === item.id ? null : item.id); }} style={{ ...btnStyle, background: "#2563EB", color: "white" }}>Enviar uma proposta</button>}
                {isOwner && item.status !== "completed" && <button type="button" onClick={() => void updateRequestStatus(item, "completed")} style={{ border: "1px solid rgba(181,195,216,.25)", borderRadius: 9, padding: ".6rem .75rem", background: "transparent", color: "#B5C3D8", cursor: "pointer" }}>Marcar como concluído</button>}
                {canAdmin && item.moderation_status === "pending" && <><button type="button" onClick={() => void moderateRequest(item.id, "approved")} style={{ ...btnStyle, padding: ".55rem .7rem" }}>Aprovar pedido</button><button type="button" onClick={() => void moderateRequest(item.id, "rejected")} style={{ ...btnStyle, padding: ".55rem .7rem", background: "#7F1D1D", color: "white" }}>Rejeitar</button></>}
              </div>
              {activeOffer === item.id && <form onSubmit={(event) => void submitOffer(event, item.id)} style={{ marginTop: ".85rem", padding: ".9rem", borderRadius: 11, border: "1px solid rgba(96,165,250,.35)", background: "#111D31", display: "grid", gap: ".7rem" }}>
                <strong style={{ color: "#93C5FD" }}>Apresentar proposta para: {item.title}</strong>
                <label style={labelStyle}>Nome da empresa / fornecedor<input required minLength={2} maxLength={120} value={offerBusiness} onChange={(e) => setOfferBusiness(e.target.value)} style={fieldStyle} placeholder="Nome comercial" /></label>
                <label style={labelStyle}>Marca e modelo / serviço<input required minLength={2} maxLength={160} value={offerModel} onChange={(e) => setOfferModel(e.target.value)} style={fieldStyle} placeholder="Ex.: Vizio Smart TV 55”" /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem" }}>
                  <label style={labelStyle}>Preço (CVE)<input required value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} style={fieldStyle} placeholder="Ex.: 48.000" /></label>
                  <label style={labelStyle}>Estado<select value={offerCondition} onChange={(e) => setOfferCondition(e.target.value as typeof offerCondition)} style={fieldStyle}><option value="new">Novo</option><option value="used">Usado</option><option value="refurbished">Recondicionado</option></select></label>
                </div>
                <label style={labelStyle}>Descrição e condições<textarea required minLength={5} maxLength={2000} rows={3} value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} placeholder="Detalhes, garantia, entrega, disponibilidade..." /></label>
                <label style={labelStyle}>Fotografia do produto (URL HTTPS)<input type="url" value={offerPhoto} onChange={(e) => setOfferPhoto(e.target.value)} style={fieldStyle} placeholder="https://..." /></label>
                {offerPhoto.trim() && <img src={offerPhoto} alt="Pré-visualização do produto" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 9 }} />}
                <label style={labelStyle}>WhatsApp do fornecedor<input required value={offerWhatsapp} onChange={(e) => setOfferWhatsapp(e.target.value)} style={fieldStyle} placeholder="+238 ..." /></label>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}><button type="submit" disabled={busy} style={btnStyle}>{busy ? "A enviar..." : "Enviar proposta"}</button><button type="button" onClick={() => setActiveOffer(null)} style={{ border: "1px solid rgba(181,195,216,.25)", borderRadius: 9, padding: ".6rem .75rem", background: "transparent", color: "#B5C3D8", cursor: "pointer" }}>Cancelar</button></div>
                <p style={{ margin: 0, color: "#8498B4", fontSize: ".73rem" }}>A proposta fica guardada no servidor e aguarda moderação antes de ser mostrada publicamente.</p>
              </form>}
              {itemOffers.length > 0 && <div style={{ display: "grid", gap: ".65rem", marginTop: ".9rem" }}><strong style={{ color: "#8EF0C8", fontSize: ".86rem" }}>{itemOffers.length} proposta(s)</strong>{itemOffers.map((offer) => <div key={offer.id} style={{ padding: ".8rem", borderRadius: 10, border: "1px solid rgba(56,214,160,.22)", background: "#10182A" }}>
                {offer.photo_url && <img src={offer.photo_url} alt={offer.model} style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 8, marginBottom: ".55rem" }} />}
                <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}><strong>{offer.model}</strong><strong style={{ color: "#8EF0C8" }}>{Number(offer.price_cve).toLocaleString("pt-PT")} CVE</strong></div>
                <div style={{ color: "#AFC0D6", fontSize: ".78rem", marginTop: ".25rem" }}>{offer.business_name} · {offer.condition === "new" ? "Novo" : offer.condition === "used" ? "Usado" : "Recondicionado"}</div>
                <p style={{ color: "#B5C3D8", fontSize: ".83rem", lineHeight: 1.5 }}>{offer.description}</p>
                {offer.moderation_status === "pending" && <p style={{ color: "#FCD34D", fontSize: ".75rem" }}>Proposta pendente de aprovação.</p>}
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  {offer.supplier_whatsapp && <a href={waLink(offer.supplier_whatsapp, `Olá! Vi a sua proposta para "${item.title}" no CaboVerde Conecta.`)} target="_blank" rel="noreferrer" style={{ color: "#8EF0C8", fontWeight: 750, fontSize: ".8rem" }}>Contactar fornecedor no WhatsApp</a>}
                  {canAdmin && offer.moderation_status === "pending" && <><button type="button" onClick={() => void moderateOffer(offer.id, "approved")} style={{ ...btnStyle, padding: ".45rem .65rem" }}>Aprovar proposta</button><button type="button" onClick={() => void moderateOffer(offer.id, "rejected")} style={{ ...btnStyle, padding: ".45rem .65rem", background: "#7F1D1D", color: "white" }}>Rejeitar</button></>}
                </div>
              </div>)}</div>}
            </article>;
          })}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <span style={{ color: "#8498B4", fontSize: ".74rem" }}>{user ? "Pedidos da comunidade e os seus pedidos privados." : "A consultar pedidos aprovados e públicos."}</span>
            <button type="button" onClick={() => void loadData()} disabled={loading} style={{ ...btnStyle, background: "#1E3A5F", color: "#DBEAFE" }}>{loading ? "A atualizar..." : "Atualizar pedidos"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
