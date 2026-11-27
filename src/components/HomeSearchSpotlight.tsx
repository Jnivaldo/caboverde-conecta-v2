import React from "react";

type HomeSearchSpotlightProps = {
  query: string;
  setQuery: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  island: string;
  setIsland: (value: string) => void;
  categories: string[];
  islands: string[];
};

const QUICK_CATEGORIES = ["Imóveis", "Viaturas", "Profissionais", "Serviços", "Produtos", "Hospedagem"];

export default function HomeSearchSpotlight({
  query,
  setQuery,
  category,
  setCategory,
  island,
  setIsland,
  categories,
  islands,
}: HomeSearchSpotlightProps) {
  const popularCategories = QUICK_CATEGORIES.filter((item) => categories.includes(item));

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    document.getElementById("public-listings-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="home-search-spotlight" aria-label="Pesquisa principal de anúncios">
      <style>{`
        .home-search-spotlight { margin: 0 auto 1.65rem; padding: clamp(1.1rem, 3.2vw, 2rem); border: 1px solid rgba(96,165,250,.42); border-radius: 22px; background: radial-gradient(ellipse at 12% 0%, rgba(37,99,235,.24), transparent 48%), linear-gradient(135deg,#111D34 0%,#142944 58%,#102D35 100%); box-shadow: 0 22px 52px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.06); }
        .home-search-kicker { display:flex; align-items:center; gap:.55rem; margin-bottom:.55rem; color:#75E8C0; font-size:.72rem; font-weight:850; letter-spacing:.15em; text-transform:uppercase; }
        .home-search-title { margin:0; color:#F8FAFC; font-size:clamp(1.35rem,3vw,2rem); line-height:1.16; letter-spacing:-.035em; font-weight:850; }
        .home-search-subtitle { margin:.45rem 0 1.15rem; color:#C2D1E4; font-size:.92rem; line-height:1.5; }
        .home-search-form { display:grid; grid-template-columns:minmax(0,1fr) 190px 170px auto; gap:.55rem; padding:.55rem; border:1px solid rgba(255,255,255,.18); border-radius:16px; background:#F8FAFC; box-shadow:0 12px 28px rgba(0,0,0,.22); }
        .home-search-input,.home-search-select { width:100%; min-width:0; min-height:54px; box-sizing:border-box; border:0; outline:none; border-radius:10px; background:#fff; color:#102039; font:600 .94rem system-ui,-apple-system,sans-serif; padding:0 .9rem; }
        .home-search-input { font-size:1.02rem; font-weight:650; }
        .home-search-input::placeholder { color:#718096; opacity:1; }
        .home-search-select { border-left:1px solid #E2E8F0; border-radius:0; cursor:pointer; }
        .home-search-submit { min-height:54px; padding:0 1.3rem; border:0; border-radius:11px; background:linear-gradient(135deg,#2563EB,#1D4ED8); color:#fff; font:800 .95rem system-ui,-apple-system,sans-serif; cursor:pointer; box-shadow:0 5px 14px rgba(37,99,235,.28); white-space:nowrap; }
        .home-search-submit:hover { filter:brightness(1.08); transform:translateY(-1px); }
        .home-search-quick { display:flex; flex-wrap:wrap; align-items:center; gap:.48rem; margin-top:1rem; }
        .home-search-quick-label { color:#AFC2D9; font-size:.76rem; font-weight:700; margin-right:.15rem; }
        .home-search-chip { padding:.42rem .78rem; border:1px solid rgba(191,219,254,.28); border-radius:999px; background:rgba(7,11,24,.25); color:#EAF2FC; font:650 .78rem system-ui,-apple-system,sans-serif; cursor:pointer; }
        .home-search-chip[aria-pressed="true"] { border-color:#6EE7B7; background:rgba(16,185,129,.2); color:#A7F3D0; }
        @media(max-width:760px) { .home-search-form { grid-template-columns:1fr 1fr; gap:.45rem; padding:.5rem; } .home-search-input { grid-column:1 / -1; min-height:58px; } .home-search-select { min-height:48px; border:1px solid #E2E8F0; border-radius:9px; } .home-search-submit { grid-column:1 / -1; min-height:52px; } }
        @media(max-width:420px) { .home-search-form { grid-template-columns:1fr; } .home-search-input,.home-search-select,.home-search-submit { grid-column:auto; } }
      `}</style>
      <div className="home-search-kicker"><span aria-hidden="true" style={{ width:8,height:8,borderRadius:99,background:"#38D6A0",boxShadow:"0 0 12px rgba(56,214,160,.65)" }} /> Encontre no mercado de Cabo Verde</div>
      <h2 className="home-search-title">O que procura hoje?</h2>
      <p className="home-search-subtitle">Pesquise anúncios, produtos, imóveis, viaturas, profissionais e serviços em todo o país.</p>
      <form className="home-search-form" onSubmit={submitSearch}>
        <input
          className="home-search-input"
          type="search"
          aria-label="O que procura?"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: apartamento na Praia, eletricista, Toyota..."
        />
        <select className="home-search-select" aria-label="Pesquisar por categoria" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="home-search-select" aria-label="Pesquisar por ilha" value={island} onChange={(event) => setIsland(event.target.value)}>
          <option value="">Todas as ilhas</option>
          {islands.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="home-search-submit" type="submit">⌕ &nbsp; Pesquisar</button>
      </form>
      <div className="home-search-quick" aria-label="Categorias populares">
        <span className="home-search-quick-label">Mais procurados:</span>
        {popularCategories.map((item) => (
          <button key={item} type="button" className="home-search-chip" aria-pressed={category === item} onClick={() => setCategory(category === item ? "" : item)}>{item}</button>
        ))}
      </div>
    </section>
  );
}
