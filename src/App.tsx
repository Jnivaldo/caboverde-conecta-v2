import React, { useMemo, useState } from "react";

type ListingStatus = "pending" | "published" | "rejected" | "suspended";
type PaymentStatus = "pending" | "confirmed" | "rejected";
type PaymentMethod = "free_launch" | "bca_transfer" | "bcn_transfer";

interface Listing {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  island: string;
  municipality: string;
  price: string;
  description: string;
  whatsapp: string;
  phone: string;
  image: string;
  ownerEmail: string;
  listingStatus: ListingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  proofRef?: string;
  slotNumber?: number;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

const OFFICIAL_WHATSAPP = "2389361197";
const OFFICIAL_PHONE_DISPLAY = "+238 936 11 97";

const BANK_ACCOUNTS = {
  bca: {
    bank: "BCA",
    holder: "JOSE NIVALDO GONCALVES DE OLIVEIRA",
    account: "7050338410001",
    nib: "000300007050338410176",
  },
  bcn: {
    bank: "BCN",
    holder: "José Nivaldo Gonçalves de Oliveira",
    account: "119418310001",
  },
};

const CATEGORIES: Record<string, string[]> = {
  Imóveis: ["Apartamentos", "Moradias", "Terrenos", "Comercial"],
  Viaturas: ["Carros", "Motas", "Comerciais", "Peças"],
  Produtos: ["Eletrónica", "Casa e Jardim", "Moda", "Equipamentos"],
  Hospedagem: ["Estadias Locais", "Quartos", "Casas de Férias", "Alojamento"],
  Profissionais: ["Eletricidade e Canalização", "Construção", "Design e Web", "Contabilidade"],
  Empresas: ["Comércio Local", "Restauração", "Agências", "Indústria"],
  Serviços: ["Limpeza e Manutenção", "Transporte", "Aulas e Formação", "Outros Serviços"],
  Oportunidades: ["Emprego", "Parcerias", "Projetos", "Estágios"],
};

const LOCATIONS: Record<string, string[]> = {
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

const INITIAL_LISTINGS: Listing[] = [];

const QUICK_PROMPTS = [
  "Como funcionam as 50 vagas gratuitas?",
  "Quanto custa após as 50 vagas e como pagar?",
  "Como falar com o suporte oficial?",
];

export default function App() {
  const [tab, setTab] = useState<"home" | "publish" | "account" | "admin">("home");
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);

  // Filtros públicos (apenas anúncios publicados)
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [island, setIsland] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  // Formulário de publicação
  const [title, setTitle] = useState("");
  const [pubCategory, setPubCategory] = useState("Imóveis");
  const [pubSubcategory, setPubSubcategory] = useState("Moradias");
  const [pubIsland, setPubIsland] = useState("Santiago");
  const [pubMunicipality, setPubMunicipality] = useState("Tarrafal");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bca_transfer");
  const [proofRef, setProofRef] = useState("");
  const [feedback, setFeedback] = useState<string>("");

  // Assistente flutuante
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Olá! Sou o assistente do CaboVerde Conecta. Posso esclarecer dúvidas sobre vagas gratuitas, pagamento de 1.500 CVE (BCA, BCN ou Hotmart Visa), publicação de anúncios e contacto direto.",
    },
  ]);

  const totalFreeSlots = 50;
  const usedFreeSlots = useMemo(
    () => listings.filter((item) => item.slotNumber !== undefined).length,
    [listings]
  );
  const freeSlotsRemaining = Math.max(0, totalFreeSlots - usedFreeSlots);
  const canClaimFreeSlot = freeSlotsRemaining > 0;

  const publicListings = useMemo(
    () =>
      listings.filter((ad) => {
        if (ad.listingStatus !== "published") return false;
        if (category && ad.category !== category) return false;
        if (subcategory && ad.subcategory !== subcategory) return false;
        if (island && ad.island !== island) return false;
        if (municipality && ad.municipality !== municipality) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          const hit =
            ad.title.toLowerCase().includes(q) ||
            ad.description.toLowerCase().includes(q) ||
            ad.island.toLowerCase().includes(q) ||
            ad.municipality.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      }),
    [listings, category, subcategory, island, municipality, query]
  );

  function addAudit(entry: string) {
    setAuditLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${entry}`, ...prev]);
  }

  function buildAssistantReply(rawText: string): string {
    const t = rawText.toLowerCase();
    if (t.includes("gratuit") || t.includes("50") || t.includes("vaga")) {
      return `A campanha de lançamento oferece 50 vagas gratuitas. Neste momento restam ${freeSlotsRemaining} de ${totalFreeSlots} vagas. Após o limite de 50 anúncios, cada publicação passa a ter o valor padrão de 1.500 CVE.`;
    }
    if (t.includes("1.500") || t.includes("1500") || t.includes("pagar") || t.includes("bca") || t.includes("bcn") || t.includes("hotmart") || t.includes("visa")) {
      return `O valor padrão após as 50 vagas gratuitas é 1.500 CVE. Pode pagar por transferência bancária para BCA (conta ${BANK_ACCOUNTS.bca.account}, NIB ${BANK_ACCOUNTS.bca.nib}) ou BCN (conta ${BANK_ACCOUNTS.bcn.account}) indicando o comprovativo, ou por cartão Visa via Hotmart. O comprovativo não publica sozinho: a publicação depende da análise da equipa responsável.`;
    }
    if (t.includes("suporte") || t.includes("contacto") || t.includes("whatsapp") || t.includes("telefone")) {
      return `O contacto entre interessados e anunciantes é direto através dos dados indicados em cada anúncio. Para assuntos da plataforma, utilize os canais oficiais apresentados na página de contacto.`;
    }
    if (t.includes("estado") || t.includes("pendente") || t.includes("publicar")) {
      return "Os estados de pagamento (pending, confirmed, rejected) e de anúncio (pending, published, rejected, suspended) são separados. Novos anúncios entram em análise até confirmação e publicação no painel administrativo.";
    }
    return `O CaboVerde Conecta reúne classificados, serviços, imóveis, viaturas, hospedagem e oportunidades nas 9 ilhas de Cabo Verde. Restam ${freeSlotsRemaining} vagas gratuitas de 50, após as quais o valor é 1.500 CVE. Contacto oficial: ${OFFICIAL_PHONE_DISPLAY}.`;
  }

  function sendChatMessage(customText?: string) {
    const content = (customText ?? chatInput).trim();
    if (!content) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: content,
    };
    const replyMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      sender: "assistant",
      text: buildAssistantReply(content),
    };

    setMessages((prev) => [...prev, userMsg, replyMsg]);
    if (!customText) {
      setChatInput("");
    }
  }

  function handlePublishSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("");

    if (!title.trim() || !price.trim() || !pubIsland || !pubMunicipality || !ownerEmail.trim()) {
      setFeedback("Preencha o título, o preço, a localização e o email de contacto.");
      return;
    }

    const usingFreeSlot = false; // A vaga só pode ser reservada após integração transacional com o servidor.
    if (paymentMethod === "free_launch" && !canClaimFreeSlot) {
      setFeedback("As 50 vagas gratuitas já foram preenchidas. Selecione uma opção de 1.500 CVE.");
      return;
    }

    if ((paymentMethod === "bca_transfer" || paymentMethod === "bcn_transfer") && !proofRef.trim()) {
      setFeedback("Indique a referência ou comprovativo da transferência bancária (1.500 CVE).");
      return;
    }

    const nextSlot = usingFreeSlot ? usedFreeSlots + 1 : undefined;
    const newAd: Listing = {
      id: `CV-${Math.floor(200 + Math.random() * 800)}`,
      title: title.trim(),
      category: pubCategory,
      subcategory: pubSubcategory,
      island: pubIsland,
      municipality: pubMunicipality,
      price: price.trim(),
      description: description.trim(),
      whatsapp: whatsapp.trim(),
      phone: phone.trim(),
      image: imageUrl.trim(),
      ownerEmail: ownerEmail.trim(),
      listingStatus: "pending",
      paymentStatus: usingFreeSlot ? "confirmed" : "pending",
      paymentMethod: usingFreeSlot ? "free_launch" : paymentMethod,
      proofRef: usingFreeSlot ? "CAMPANHA-50-GRATIS" : proofRef.trim(),
      slotNumber: nextSlot,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setListings((prev) => [newAd, ...prev]);
    addAudit(
      `Novo anúncio ${newAd.id} ("${newAd.title}") criado em estado pendente (${
        usingFreeSlot ? `vaga gratuita #${nextSlot}` : "1.500 CVE pendente de confirmação"
      }).`
    );

    setTitle("");
    setPrice("");
    setDescription("");
    setProofRef("");
    setFeedback("Pré-registo criado apenas nesta sessão do navegador. Ainda não foi enviado ao servidor, não reservou uma vaga gratuita e não constitui comprovativo nem pagamento. A publicação ficará disponível quando a ligação segura ao servidor estiver ativa.");
  }

  function updatePaymentAndListing(
    id: string,
    nextPayment: PaymentStatus,
    nextListing: ListingStatus
  ) {
    setListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, paymentStatus: nextPayment, listingStatus: nextListing }
          : item
      )
    );
    addAudit(
      `Ação administrativa local em ${id}: pagamento=${nextPayment}, anúncio=${nextListing}.`
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#070B18",
        color: "#F8FAFC",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          backgroundColor: "#10182A",
          borderBottom: "1px solid rgba(181,195,216,0.16)",
          padding: "0.95rem 1.25rem",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.85rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ fontSize: "1.18rem", letterSpacing: "-0.01em" }}>
              CaboVerde Conecta
            </strong>
            <div style={{ fontSize: "0.82rem", color: "#38D6A0", fontWeight: 600 }}>
              {freeSlotsRemaining} vagas gratuitas restantes ({usedFreeSlots}/{totalFreeSlots}) · Após 50: 1.500 CVE
            </div>
          </div>

          <nav style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            {[
              { key: "home", label: "Início" },
              { key: "publish", label: "Publicar Anúncio" },
              { key: "account", label: "Minha Conta" },
            ].map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key as typeof tab)}
                  style={{
                    padding: "0.5rem 0.9rem",
                    borderRadius: 10,
                    border: active
                      ? "1px solid rgba(96,165,250,0.65)"
                      : "1px solid rgba(181,195,216,0.18)",
                    backgroundColor: active ? "#2563EB" : "#151F33",
                    color: "#F8FAFC",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1.85rem 1.25rem 5rem" }}>
        {tab === "home" && (
          <>
            <h1 style={{ margin: "0 0 0.45rem", fontSize: "1.95rem", letterSpacing: "-0.02em" }}>
              Classificados, serviços e oportunidades em Cabo Verde
            </h1>
            <p style={{ margin: "0 0 1.35rem", color: "#B5C3D8", fontSize: "0.96rem" }}>
              Divulgação e contacto direto entre interessados e anunciantes. Após as 50 vagas gratuitas: 1.500 CVE.
            </p>

            <div
              style={{
                backgroundColor: "#10182A",
                border: "1px solid rgba(181,195,216,0.16)",
                borderRadius: 14,
                padding: "1rem",
                marginBottom: "1.5rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "0.65rem",
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar por título ou ilha..."
                style={inputStyle}
              />
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory("");
                }}
                style={inputStyle}
              >
                <option value="">Todas as categorias</option>
                {Object.keys(CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={!category}
                style={inputStyle}
              >
                <option value="">Todas as subcategorias</option>
                {(category ? CATEGORIES[category] || [] : []).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <select
                value={island}
                onChange={(e) => {
                  setIsland(e.target.value);
                  setMunicipality("");
                }}
                style={inputStyle}
              >
                <option value="">Todas as ilhas</option>
                {Object.keys(LOCATIONS).map((isl) => (
                  <option key={isl} value={isl}>
                    {isl}
                  </option>
                ))}
              </select>
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                disabled={!island}
                style={inputStyle}
              >
                <option value="">Todos os concelhos</option>
                {(island ? LOCATIONS[island] || [] : []).map((mun) => (
                  <option key={mun} value={mun}>
                    {mun}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setSubcategory("");
                  setIsland("");
                  setMunicipality("");
                }}
                style={secondaryBtnStyle}
              >
                Limpar
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.65rem" }}>
              {Object.keys(CATEGORIES).map((cat) => {
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(selected ? "" : cat);
                      setSubcategory("");
                    }}
                    style={{
                      padding: "0.46rem 0.9rem",
                      borderRadius: 999,
                      border: selected
                        ? "1px solid #3478F6"
                        : "1px solid rgba(181,195,216,0.18)",
                      backgroundColor: selected ? "#2563EB" : "#151F33",
                      color: "#F8FAFC",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(275px, 1fr))",
                gap: "1.2rem",
              }}
            >
              {publicListings.map((ad) => (
                <article key={ad.id} style={cardStyle}>
                  <div style={imageFrameStyle}>
                    <img
                      src={ad.image}
                      alt={ad.title}
                      onClick={() => setLightbox({ src: ad.image, title: ad.title })}
                      style={cardImageStyle}
                    />
                  </div>
                  <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
                    <span style={{ fontSize: "0.79rem", color: "#B5C3D8" }}>
                      {ad.category} · {ad.subcategory} · {ad.island} ({ad.municipality})
                    </span>
                    <h2 style={{ margin: 0, fontSize: "1.03rem", lineHeight: 1.35 }}>{ad.title}</h2>
                    <strong style={{ color: "#38D6A0", fontSize: "0.98rem" }}>{ad.price}</strong>
                    <p style={{ margin: "0.15rem 0 0.35rem", fontSize: "0.86rem", color: "#B5C3D8", lineHeight: 1.45 }}>
                      {ad.description}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                      <a
                        href={`https://wa.me/${ad.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={whatsappBtnStyle}
                      >
                        Contactar via WhatsApp
                      </a>
                      <a
                        href={`tel:${ad.phone.replace(/\s+/g, "")}`}
                        style={callLinkStyle}
                      >
                        Ligar
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "publish" && (
          <section style={panelStyle}>
            <div style={{ marginBottom: "1.1rem" }}>
              <span style={eyebrowStyle("#8B5CF6")}>SUBMISSÃO DE ANÚNCIO</span>
              <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>Publicar Anúncio</h1>
              <p style={{ margin: 0, color: "#B5C3D8", fontSize: "0.92rem", lineHeight: 1.5 }}>
                Primeiros 50 anúncios gratuitos ({freeSlotsRemaining} restantes). Valor padrão após campanha:{" "}
                <strong style={{ color: "#F8FAFC" }}>1.500 CVE</strong>. O envio de comprovativo nunca publica o anúncio
                automaticamente — depende sempre da confirmação do administrador.
              </p>
            </div>

            {feedback && <div style={feedbackBoxStyle}>{feedback}</div>}

            <form onSubmit={handlePublishSubmit} style={{ display: "grid", gap: "0.9rem" }}>
              <div style={subCardStyle}>
                <strong style={{ fontSize: "0.92rem", color: "#F8FAFC" }}>1. Dados Principais e Localização</strong>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do anúncio (ex.: Moradia T2 no Tarrafal)"
                  style={inputStyle}
                />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "0.65rem" }}>
                  <select
                    value={pubCategory}
                    onChange={(e) => {
                      const nextCat = e.target.value;
                      setPubCategory(nextCat);
                      setPubSubcategory(CATEGORIES[nextCat]?.[0] || "Geral");
                    }}
                    style={inputStyle}
                  >
                    {Object.keys(CATEGORIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pubSubcategory}
                    onChange={(e) => setPubSubcategory(e.target.value)}
                    style={inputStyle}
                  >
                    {(CATEGORIES[pubCategory] || []).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pubIsland}
                    onChange={(e) => {
                      const nextIsl = e.target.value;
                      setPubIsland(nextIsl);
                      setPubMunicipality(LOCATIONS[nextIsl]?.[0] || "");
                    }}
                    style={inputStyle}
                  >
                    {Object.keys(LOCATIONS).map((isl) => (
                      <option key={isl} value={isl}>
                        {isl}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pubMunicipality}
                    onChange={(e) => setPubMunicipality(e.target.value)}
                    style={inputStyle}
                  >
                    {(LOCATIONS[pubIsland] || []).map((mun) => (
                      <option key={mun} value={mun}>
                        {mun}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "0.65rem" }}>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Preço ou valor (ex.: 25.000 CVE)"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="WhatsApp (ex.: 2389361197)"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefone (+238 936 11 97)"
                    style={inputStyle}
                  />
                </div>

                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="E-mail do anunciante"
                  style={inputStyle}
                />

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL da imagem (enquadrada em 4:3 com ampliação ao clicar)"
                  style={inputStyle}
                />

                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o imóvel, viatura, produto, serviço ou oportunidade..."
                  style={inputStyle}
                />
              </div>

              <div style={subCardStyle}>
                <strong style={{ fontSize: "0.92rem", color: "#F8FAFC" }}>2. Modalidade e Pagamento (1.500 CVE)</strong>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  style={inputStyle}
                >
                  {canClaimFreeSlot && (
                    <option value="free_launch">
                      Campanha de Lançamento — Vaga Gratuita ({freeSlotsRemaining} de 50 restantes)
                    </option>
                  )}
                  <option value="bca_transfer">Transferência Bancária BCA — 1.500 CVE (com comprovativo)</option>
                  <option value="bcn_transfer">Transferência Bancária BCN — 1.500 CVE (com comprovativo)</option>
                </select>

                {(paymentMethod === "bca_transfer" || paymentMethod === "bcn_transfer") && (
                  <div style={{ fontSize: "0.85rem", color: "#B5C3D8", lineHeight: 1.55 }}>
                    <div>
                      <strong style={{ color: "#F8FAFC" }}>BCA:</strong> {BANK_ACCOUNTS.bca.holder} · Conta{" "}
                      {BANK_ACCOUNTS.bca.account} · NIB {BANK_ACCOUNTS.bca.nib}
                    </div>
                    <div>
                      <strong style={{ color: "#F8FAFC" }}>BCN:</strong> {BANK_ACCOUNTS.bcn.holder} · Conta{" "}
                      {BANK_ACCOUNTS.bcn.account}
                    </div>
                    <input
                      type="text"
                      value={proofRef}
                      onChange={(e) => setProofRef(e.target.value)}
                      placeholder="Referência ou número do comprovativo de 1.500 CVE"
                      style={{ ...inputStyle, marginTop: "0.55rem", width: "100%" }}
                    />
                  </div>
                )}
              </div>

              <button type="submit" style={primaryBtnStyle}>
                Submeter Anúncio para Análise
              </button>
            </form>
          </section>
        )}

        {tab === "account" && (
          <section style={panelStyle}>
            <span style={eyebrowStyle("#38D6A0")}>ÁREA DO ANUNCIANTE</span>
            <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>Minha Conta</h1>
            <p style={{ margin: "0 0 1.2rem", color: "#B5C3D8", fontSize: "0.92rem" }}>
              Estados separados com clareza: <strong>Pagamento</strong> (<em>pending</em>, <em>confirmed</em>,{" "}
              <em>rejected</em>) e <strong>Anúncio</strong> (<em>pending</em>, <em>published</em>, <em>rejected</em>,{" "}
              <em>suspended</em>).
            </p>

            <div style={{ display: "grid", gap: "0.85rem" }}>
              {listings.map((item) => (
                <div key={item.id} style={rowCardStyle}>
                  <div style={{ display: "flex", gap: "0.9rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ width: 96, aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", backgroundColor: "#10182A" }}>
                      <img
                        src={item.image}
                        alt={item.title}
                        onClick={() => setLightbox({ src: item.image, title: item.title })}
                        style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in", display: "block" }}
                      />
                    </div>
                    <div>
                      <strong style={{ fontSize: "1rem" }}>
                        {item.id} · {item.title}
                      </strong>
                      <div style={{ fontSize: "0.84rem", color: "#B5C3D8", marginTop: "0.2rem" }}>
                        {item.category} ({item.subcategory}) · {item.island} ·{" "}
                        <span style={{ color: "#38D6A0", fontWeight: 600 }}>{item.price}</span> · Ref:{" "}
                        {item.proofRef || "—"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
                    <span style={badgeStyle("#1D4ED8")}>Pagamento: {item.paymentStatus}</span>
                    <span style={badgeStyle("#6D28D9")}>Anúncio: {item.listingStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "admin" && (
          <section style={panelStyle}>
            <span style={eyebrowStyle("#EC4899")}>GOVERNANÇA E MODERAÇÃO</span>
            <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>
              Painel Administrativo
            </h1>
            <p style={{ margin: "0 0 1.2rem", color: "#B5C3D8", fontSize: "0.92rem" }}>
              Vagas gratuitas ocupadas: <strong style={{ color: "#38D6A0" }}>{usedFreeSlots}/{totalFreeSlots}</strong> ·
              Anúncios publicados: <strong style={{ color: "#F8FAFC" }}>{publicListings.length}</strong> · Contacto oficial:{" "}
              <strong>{OFFICIAL_PHONE_DISPLAY}</strong>.
            </p>

            <div style={{ display: "grid", gap: "0.9rem", marginBottom: "1.5rem" }}>
              {listings.map((item) => (
                <div key={item.id} style={subCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ fontSize: "1rem" }}>
                        {item.id} — {item.title}
                      </strong>
                      <div style={{ fontSize: "0.83rem", color: "#B5C3D8", marginTop: "0.15rem" }}>
                        Anunciante: {item.ownerEmail} · Método: {item.paymentMethod} · Ref: {item.proofRef || "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
                      <span style={badgeStyle("#1D4ED8")}>Pagamento: {item.paymentStatus}</span>
                      <span style={badgeStyle("#6D28D9")}>Anúncio: {item.listingStatus}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() => updatePaymentAndListing(item.id, "confirmed", "published")}
                      style={actionBtnStyle("#16A34A")}
                    >
                      Confirmar Pagamento e Publicar
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePaymentAndListing(item.id, "confirmed", "pending")}
                      style={actionBtnStyle("#2563EB")}
                    >
                      Só Confirmar Pagamento
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePaymentAndListing(item.id, item.paymentStatus, "suspended")}
                      style={actionBtnStyle("#D97706")}
                    >
                      Suspender
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePaymentAndListing(item.id, "rejected", "rejected")}
                      style={actionBtnStyle("#DC2626")}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={subCardStyle}>
              <strong style={{ fontSize: "0.98rem" }}>Registo de Auditoria</strong>
              <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.15rem", fontSize: "0.85rem", color: "#B5C3D8", lineHeight: 1.55 }}>
                {auditLogs.map((log, idx) => (
                  <li key={idx}>{log}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      {/* Assistente Flutuante */}
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0.65rem",
        }}
      >
        {chatOpen && (
          <div
            style={{
              width: "min(360px, calc(100vw - 32px))",
              backgroundColor: "#10182A",
              border: "1px solid rgba(181,195,216,0.22)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                backgroundColor: "#151F33",
                borderBottom: "1px solid rgba(181,195,216,0.14)",
                padding: "0.8rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.95rem" }}>Assistente CaboVerde Conecta</strong>
                <div style={{ fontSize: "0.75rem", color: "#38D6A0" }}>Ajuda sobre vagas, 1.500 CVE e anúncios</div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(181,195,216,0.2)",
                  color: "#F8FAFC",
                  borderRadius: 8,
                  padding: "0.25rem 0.55rem",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Fechar
              </button>
            </div>

            <div
              style={{
                maxHeight: 270,
                overflowY: "auto",
                padding: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    padding: "0.6rem 0.78rem",
                    borderRadius: 12,
                    backgroundColor: m.sender === "user" ? "#2563EB" : "#151F33",
                    border:
                      m.sender === "user"
                        ? "1px solid rgba(96,165,250,0.5)"
                        : "1px solid rgba(181,195,216,0.16)",
                    color: "#F8FAFC",
                    fontSize: "0.84rem",
                    lineHeight: 1.42,
                  }}
                >
                  {m.text}
                </div>
              ))}

              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendChatMessage(q)}
                    style={{
                      padding: "0.34rem 0.6rem",
                      borderRadius: 999,
                      border: "1px solid rgba(181,195,216,0.18)",
                      backgroundColor: "#151F33",
                      color: "#B5C3D8",
                      cursor: "pointer",
                      fontSize: "0.74rem",
                      textAlign: "left",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              style={{
                display: "flex",
                gap: "0.45rem",
                padding: "0.7rem 0.85rem",
                borderTop: "1px solid rgba(181,195,216,0.14)",
                backgroundColor: "#10182A",
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escreva a sua dúvida..."
                style={{ ...inputStyle, flex: 1, padding: "0.5rem 0.7rem", fontSize: "0.84rem" }}
              />
              <button type="submit" style={{ ...actionBtnStyle("#2563EB"), padding: "0.5rem 0.8rem" }}>
                Enviar
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setChatOpen((prev) => !prev)}
          style={{
            padding: "0.72rem 1.05rem",
            borderRadius: 999,
            border: "1px solid rgba(96,165,250,0.55)",
            backgroundColor: "#2563EB",
            color: "#F8FAFC",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
          }}
        >
          {chatOpen ? "Ocultar Assistente" : "Assistente"}
        </button>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(3,6,15,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#151F33",
              border: "1px solid rgba(181,195,216,0.2)",
              borderRadius: 14,
              padding: "1rem",
              maxWidth: 820,
              width: "100%",
              textAlign: "center",
            }}
          >
            <img
              src={lightbox.src}
              alt={lightbox.title}
              style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", borderRadius: 10 }}
            />
            <p style={{ margin: "0.75rem 0", color: "#B5C3D8" }}>{lightbox.title}</p>
            <button type="button" onClick={() => setLightbox(null)} style={actionBtnStyle("#2563EB")}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  backgroundColor: "#10182A",
  border: "1px solid rgba(181,195,216,0.16)",
  borderRadius: 16,
  padding: "1.35rem",
};

const subCardStyle: React.CSSProperties = {
  backgroundColor: "#151F33",
  border: "1px solid rgba(181,195,216,0.15)",
  borderRadius: 12,
  padding: "1rem",
  display: "grid",
  gap: "0.65rem",
};

const rowCardStyle: React.CSSProperties = {
  backgroundColor: "#151F33",
  border: "1px solid rgba(181,195,216,0.15)",
  borderRadius: 12,
  padding: "0.95rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.85rem",
  flexWrap: "wrap",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#151F33",
  border: "1px solid rgba(181,195,216,0.16)",
  borderRadius: 14,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const imageFrameStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "4 / 3",
  maxHeight: 205,
  overflow: "hidden",
  backgroundColor: "#10182A",
};

const cardImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  maxHeight: 205,
  objectFit: "cover",
  display: "block",
  cursor: "zoom-in",
};

const inputStyle: React.CSSProperties = {
  padding: "0.64rem 0.82rem",
  borderRadius: 10,
  border: "1px solid rgba(181,195,216,0.2)",
  backgroundColor: "#151F33",
  color: "#F8FAFC",
  fontSize: "0.88rem",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "0.64rem 0.9rem",
  borderRadius: 10,
  border: "1px solid rgba(181,195,216,0.2)",
  backgroundColor: "#151F33",
  color: "#F8FAFC",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.86rem",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "0.78rem 1.15rem",
  borderRadius: 10,
  border: "none",
  backgroundColor: "#2563EB",
  color: "#F8FAFC",
  fontWeight: 700,
  fontSize: "0.92rem",
  cursor: "pointer",
};

const whatsappBtnStyle: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: "0.56rem 0.75rem",
  borderRadius: 10,
  backgroundColor: "#16A34A",
  color: "#F8FAFC",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.85rem",
};

const callLinkStyle: React.CSSProperties = {
  padding: "0.56rem 0.75rem",
  borderRadius: 10,
  border: "1px solid rgba(181,195,216,0.22)",
  backgroundColor: "#10182A",
  color: "#F8FAFC",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.85rem",
};

const feedbackBoxStyle: React.CSSProperties = {
  backgroundColor: "#151F33",
  border: "1px solid #38D6A0",
  borderRadius: 10,
  padding: "0.85rem 1rem",
  marginBottom: "1rem",
  color: "#F8FAFC",
  fontSize: "0.88rem",
  lineHeight: 1.45,
};

function eyebrowStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    fontSize: "0.73rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color,
  };
}

function badgeStyle(bg: string):
