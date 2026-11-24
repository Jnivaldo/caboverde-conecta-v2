import React, { useMemo, useState } from "react";

type ListingStatus = "pending" | "published" | "rejected" | "suspended";
type PaymentStatus = "pending" | "confirmed" | "rejected";
type PaymentMethod = "free_launch" | "bca_transfer" | "bcn_transfer" | "hotmart_visa";

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

const ADMIN_EMAIL = "jnivaldoliveira@gmail.com";
const OFFICIAL_WHATSAPP = "2389361197";
const OFFICIAL_PHONE_DISPLAY = "+238 936 11 97";
const HOTMART_VISA_CHECKOUT_URL = "https://pay.hotmart.com/caboverde-conecta-1500cve";

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

const INITIAL_LISTINGS: Listing[] = [
  {
    id: "CV-101",
    title: "Moradia T3 com Terraço no Tarrafal",
    category: "Imóveis",
    subcategory: "Moradias",
    island: "Santiago",
    municipality: "Tarrafal",
    price: "45.000 CVE",
    description: "Espaço amplo, vista desafogada e acesso rápido à zona central do Tarrafal.",
    whatsapp: OFFICIAL_WHATSAPP,
    phone: OFFICIAL_PHONE_DISPLAY,
    image:
      "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcQ602_V6Bm-Sl0wTIbkSfMH_xE6oWXMmWQmoJUNks6tn018PYVmnD4Dp5SGPpyNRPmwUspVrrwcMO6sbbs",
    ownerEmail: ADMIN_EMAIL,
    listingStatus: "published",
    paymentStatus: "confirmed",
    paymentMethod: "free_launch",
    slotNumber: 1,
    createdAt: "2026-11-20",
  },
  {
    id: "CV-102",
    title: "Viatura Económica Pronta a Circular",
    category: "Viaturas",
    subcategory: "Carros",
    island: "São Vicente",
    municipality: "Mindelo",
    price: "890.000 CVE",
    description: "Manutenção em dia e documentação regularizada para uso diário.",
    whatsapp: OFFICIAL_WHATSAPP,
    phone: OFFICIAL_PHONE_DISPLAY,
    image:
      "https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQi_dB4Y9u1poR5cakQFiNRUHiAoOLlstTrY4Ebbg-UyZlJX-z1lKm5sq2VLvwEbEOold0yo61T8_lrfjI",
    ownerEmail: ADMIN_EMAIL,
    listingStatus: "published",
    paymentStatus: "confirmed",
    paymentMethod: "free_launch",
    slotNumber: 2,
    createdAt: "2026-11-21",
  },
  {
    id: "CV-103",
    title: "Serviços Elétricos e Manutenção Técnica",
    category: "Profissionais",
    subcategory: "Eletricidade e Canalização",
    island: "Sal",
    municipality: "Santa Maria",
    price: "Sob consulta",
    description: "Instalações, quadros elétricos e reparações rápidas com contacto direto.",
    whatsapp: OFFICIAL_WHATSAPP,
    phone: OFFICIAL_PHONE_DISPLAY,
    image:
      "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcTJUnycCcXeCLv0rfkfUG9pPTZ3C3WprYvvkyJoS37Bb3a7p_2yy56MqaTCRagT7HuyfHUo6bCV29_blUU",
    ownerEmail: ADMIN_EMAIL,
    listingStatus: "published",
    paymentStatus: "confirmed",
    paymentMethod: "free_launch",
    slotNumber: 3,
    createdAt: "2026-11-22",
  },
];

export default function App() {
  const [tab, setTab] = useState<"home" | "publish" | "account" | "admin">("home");
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [auditLogs, setAuditLogs] = useState<string[]>([
    "Sistema iniciado: campanha de 50 vagas gratuitas ativa (3 ocupadas).",
  ]);

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
  const [ownerEmail, setOwnerEmail] = useState(ADMIN_EMAIL);
  const [whatsapp, setWhatsapp] = useState(OFFICIAL_WHATSAPP);
  const [phone, setPhone] = useState(OFFICIAL_PHONE_DISPLAY);
  const [imageUrl, setImageUrl] = useState(INITIAL_LISTINGS[0].image);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bca_transfer");
  const [proofRef, setProofRef] = useState("");
  const [feedback, setFeedback] = useState<string>("");

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

  function handlePublishSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("");

    if (!title.trim() || !price.trim()) {
      setFeedback("Preencha pelo menos o título e o valor/preço do anúncio.");
      return;
    }

    const usingFreeSlot = paymentMethod === "free_launch" && canClaimFreeSlot;
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
      description: description.trim() || "Anúncio publicado no CaboVerde Conecta.",
      whatsapp: whatsapp.trim() || OFFICIAL_WHATSAPP,
      phone: phone.trim() || OFFICIAL_PHONE_DISPLAY,
      image: imageUrl.trim() || INITIAL_LISTINGS[0].image,
      ownerEmail: ownerEmail.trim() || ADMIN_EMAIL,
      // Comprovativo nunca publica sozinho: aguarda confirmação do admin
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
    setFeedback(
      usingFreeSlot
        ? `Anúncio registado na vaga gratuita #${nextSlot} e enviado para revisão do administrador.`
        : "Pedido de 1.500 CVE registado como PAGAMENTO PENDENTE e ANÚNCIO PENDENTE. A publicação ocorre apenas após confirmação do administrador."
    );
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
      `Admin (${ADMIN_EMAIL}) atualizou ${id}: pagamento=${nextPayment}, anúncio=${nextListing}.`
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
              { key: "admin", label: "Painel Admin" },
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

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1.85rem 1.25rem 3rem" }}>
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
                  <option value="hotmart_visa">Checkout Hotmart (Cartão Visa) — 1.500 CVE</option>
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

                {paymentMethod === "hotmart_visa" && (
                  <div style={{ fontSize: "0.85rem", color: "#B5C3D8", lineHeight: 1.55 }}>
                    <div>
                      Pagamento por cartão Visa via Hotmart (1.500 CVE):{" "}
                      <a
                        href={HOTMART_VISA_CHECKOUT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#38D6A0", fontWeight: 600 }}
                      >
                        Abrir Checkout Hotmart
                      </a>
                    </div>
                    <input
                      type="text"
                      value={proofRef}
                      onChange={(e) => setProofRef(e.target.value)}
                      placeholder="Código da compra Hotmart (opcional antes da confirmação)"
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
              Painel Admin ({ADMIN_EMAIL})
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

function badgeStyle(bg: string): React.CSSProperties {
  return {
    padding: "0.3rem 0.68rem",
    borderRadius: 999,
    backgroundColor: bg,
    color: "#F8FAFC",
    fontWeight: 600,
  };
}

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: "0.5rem 0.85rem",
    borderRadius: 8,
    border: "none",
    backgroundColor: bg,
    color: "#F8FAFC",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.82rem",
  };
}
