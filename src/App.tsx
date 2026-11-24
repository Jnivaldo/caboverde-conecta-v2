import React, { useState } from "react";

const CATEGORIES = [
  "Imóveis",
  "Viaturas",
  "Produtos",
  "Hospedagem",
  "Profissionais",
  "Empresas",
  "Serviços",
  "Oportunidades",
];

const INITIAL_ADS = [
  {
    id: "1",
    title: "Moradia T3 com Terraço no Tarrafal",
    category: "Imóveis",
    island: "Santiago",
    price: "45.000 CVE",
    whatsapp: "2389361197",
    image:
      "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcQ602_V6Bm-Sl0wTIbkSfMH_xE6oWXMmWQmoJUNks6tn018PYVmnD4Dp5SGPpyNRPmwUspVrrwcMO6sbbs",
  },
  {
    id: "2",
    title: "Viatura Económica Pronta a Circular",
    category: "Viaturas",
    island: "São Vicente",
    price: "890.000 CVE",
    whatsapp: "2389361197",
    image:
      "https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQi_dB4Y9u1poR5cakQFiNRUHiAoOLlstTrY4Ebbg-UyZlJX-z1lKm5sq2VLvwEbEOold0yo61T8_lrfjI",
  },
  {
    id: "3",
    title: "Serviços Elétricos e Manutenção Técnica",
    category: "Profissionais",
    island: "Sal",
    price: "Sob consulta",
    whatsapp: "2389361197",
    image:
      "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcTJUnycCcXeCLv0rfkfUG9pPTZ3C3WprYvvkyJoS37Bb3a7p_2yy56MqaTCRagT7HuyfHUo6bCV29_blUU",
  },
];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);

  const totalSlots = 50;
  const usedSlots = 12;
  const freeSlotsLeft = Math.max(0, totalSlots - usedSlots);

  const filteredAds = INITIAL_ADS.filter((ad) => {
    const matchesCat = !selectedCategory || ad.category === selectedCategory;
    const matchesText =
      !query.trim() ||
      ad.title.toLowerCase().includes(query.toLowerCase()) ||
      ad.island.toLowerCase().includes(query.toLowerCase());
    return matchesCat && matchesText;
  });

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
          padding: "1rem 1.25rem",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <strong style={{ fontSize: "1.2rem" }}>CaboVerde Conecta</strong>
          <span style={{ color: "#38D6A0", fontWeight: 700, fontSize: "0.9rem" }}>
            {freeSlotsLeft} vagas gratuitas restantes ({usedSlots}/{totalSlots})
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem" }}>
          Classificados, serviços e oportunidades em Cabo Verde
        </h1>
        <p style={{ margin: "0 0 1.5rem", color: "#B5C3D8" }}>
          Divulgação e contacto direto entre interessados e anunciantes. Após as 50 vagas gratuitas: 1.500 CVE.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por título ou ilha..."
            style={{
              flex: "1 1 260px",
              padding: "0.65rem 0.85rem",
              borderRadius: 10,
              border: "1px solid rgba(181,195,216,0.2)",
              backgroundColor: "#151F33",
              color: "#F8FAFC",
            }}
          />
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("");
              setQuery("");
            }}
            style={{
              padding: "0.65rem 1rem",
              borderRadius: 10,
              border: "1px solid rgba(181,195,216,0.2)",
              backgroundColor: "#10182A",
              color: "#F8FAFC",
              cursor: "pointer",
            }}
          >
            Limpar
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 999,
                border:
                  selectedCategory === cat
                    ? "1px solid #3478F6"
                    : "1px solid rgba(181,195,216,0.18)",
                backgroundColor: selectedCategory === cat ? "#3478F6" : "#151F33",
                color: "#F8FAFC",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1.15rem",
          }}
        >
          {filteredAds.map((ad) => (
            <article
              key={ad.id}
              style={{
                backgroundColor: "#151F33",
                border: "1px solid rgba(181,195,216,0.16)",
                borderRadius: 14,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  maxHeight: 210,
                  overflow: "hidden",
                  backgroundColor: "#10182A",
                }}
              >
                <img
                  src={ad.image}
                  alt={ad.title}
                  onClick={() => setLightboxImg({ src: ad.image, title: ad.title })}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: 210,
                    objectFit: "cover",
                    display: "block",
                    cursor: "zoom-in",
                  }}
                />
              </div>
              <div style={{ padding: "0.95rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.78rem", color: "#B5C3D8" }}>
                  {ad.category} · {ad.island}
                </span>
                <h2 style={{ margin: 0, fontSize: "1rem" }}>{ad.title}</h2>
                <strong style={{ color: "#38D6A0" }}>{ad.price}</strong>
                <a
                  href={`https://wa.me/${ad.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: "0.5rem",
                    textAlign: "center",
                    padding: "0.55rem 0.85rem",
                    borderRadius: 10,
                    backgroundColor: "#16A34A",
                    color: "#F8FAFC",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                  }}
                >
                  Contactar via WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>
      </main>

      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
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
              src={lightboxImg.src}
              alt={lightboxImg.title}
              style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", borderRadius: 10 }}
            />
            <p style={{ margin: "0.75rem 0", color: "#B5C3D8" }}>{lightboxImg.title}</p>
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#3478F6",
                color: "#F8FAFC",
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
