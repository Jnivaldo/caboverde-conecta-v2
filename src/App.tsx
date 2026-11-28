import React, { useEffect, useMemo, useRef, useState } from "react";
import "./responsive.css";import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
const shareLinkStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46, padding: ".7rem .75rem", border: "1px solid rgba(181,195,216,.24)", borderRadius: 10, color: "#E6EEF8", background: "rgba(255,255,255,.055)", textDecoration: "none", textAlign: "center", fontSize: ".88rem", fontWeight: 750 };
const AuthPanel = React.lazy(() => import("./components/AuthPanel"));
const ListingMediaPicker = React.lazy(() => import("./components/ListingMediaPicker"));
const ListingMediaManager = React.lazy(() => import("./components/ListingMediaManager"));
const ProcuroOfereco = React.lazy(() => import("./components/ProcuroOfereco"));
const UnifiedProcurementSearch = React.lazy(() => import("./components/UnifiedProcurementSearch"));
const ProcuroHomeHighlights = React.lazy(() => import("./components/ProcuroHomeHighlights"));
const HomeSearchSpotlight = React.lazy(() => import("./components/HomeSearchSpotlight"));
const ProcuroAdminPanel = React.lazy(() => import("./components/ProcuroAdminPanel"));
const NotificationCenter = React.lazy(() => import("./components/NotificationCenter"));
const MonetizationPanel = React.lazy(() => import("./components/MonetizationPanel"));
const ListingPaymentsPanel = React.lazy(() => import("./components/ListingPaymentsPanel"));
const FinancePanel = React.lazy(() => import("./components/FinancePanel"));
const ListingReportsPanel = React.lazy(() => import("./components/ListingReportsPanel"));

import {
  type Listing,
  type ListingStatus,
  type PaymentStatus,
  type PaymentMethod,
} from "./data/listingRepository";
import { countListingsByStatus, getPreviewListingsByEmail } from "./data/listingManagement";
import { applyListingEdit, validateListingEdit, type EditableListingFields } from "./data/listingEditPolicy";

import { getSearchMatch, getRelatedSearchReason } from "./lib/smartSearch";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

const CATEGORIES: Record<string, string[]> = {
  Imóveis: [
    "Casas", "Moradias", "Prédios", "Edifícios completos", "Apartamentos", "Estúdios e Kitnets",
    "Quartos", "Terrenos para construção", "Terrenos agrícolas", "Quintas e propriedades rurais",
    "Lojas", "Espaços comerciais", "Escritórios", "Armazéns e depósitos", "Garagens e estacionamentos",
    "Imóveis industriais", "Imóveis em construção", "Imóveis para reabilitação", "Ruínas",
    "Arrendamento", "Compra e venda", "Imóveis para investimento", "Outros imóveis"
  ],
  Viaturas: [
    "Carros ligeiros", "Motas e scooters", "Ciclomotores", "Carrinhas e comerciais", "Pick-ups",
    "Jipes e todo-o-terreno", "Camiões e pesados", "Autocarros e minibus", "Táxis e transporte coletivo",
    "Veículos agrícolas", "Reboques e atrelados", "Barcos e embarcações", "Motores náuticos",
    "Peças e acessórios", "Pneus e jantes", "Baterias", "Carros para peças", "Aluguer de viaturas",
    "Outras viaturas"
  ],
  Produtos: [
    "Telemóveis e smartphones", "Computadores e tablets", "Televisores e áudio", "Fotografia e vídeo",
    "Eletrodomésticos", "Móveis e decoração", "Casa e jardim", "Materiais de construção",
    "Roupa e calçado", "Bolsas e acessórios", "Relógios e joalharia", "Cosmética e beleza",
    "Bebés e crianças", "Brinquedos e jogos", "Livros e material escolar", "Instrumentos musicais",
    "Alimentação e bebidas", "Produtos artesanais", "Arte e antiguidades", "Equipamentos desportivos",
    "Peças e acessórios", "Produtos usados", "Outros produtos"
  ],
  Hospedagem: [
    "Hotéis", "Apart-hotéis", "Pensões e residenciais", "Hostels", "Quartos para hóspedes",
    "Casas de férias", "Moradias turísticas", "Apartamentos turísticos", "Alojamento rural",
    "Alojamento de longa duração", "Espaços de campismo", "Outras hospedagens"
  ],
  Profissionais: [
    "Eletricistas", "Canalizadores e picheleiros", "Pedreiros e alvenaria", "Pintores",
    "Carpinteiros e marceneiros", "Serralheiros e soldadores", "Técnicos de frio e ar condicionado",
    "Mecânicos e eletricistas auto", "Arquitetos", "Engenheiros", "Topógrafos",
    "Advogados e solicitadores", "Contabilistas", "Consultores", "Designers e web developers",
    "Fotógrafos e videógrafos", "Tradutores", "Professores e explicadores", "Cabeleireiros e barbeiros",
    "Esteticistas", "Cozinheiros e catering", "Jardineiros", "Limpeza doméstica", "Outros profissionais"
  ],
  Empresas: [
    "Comércio e lojas", "Supermercados e minimercados", "Restaurantes", "Cafés e bares",
    "Hotéis e alojamento", "Agências de viagens", "Imobiliárias", "Oficinas e centros auto",
    "Construção civil", "Transportes e logística", "Agricultura e pesca", "Indústria e produção",
    "Tecnologia e informática", "Marketing e comunicação", "Saúde e bem-estar", "Educação e formação",
    "Serviços financeiros", "Associações e organizações", "Distribuidores e fornecedores", "Outras empresas"
  ],
  Serviços: [
    "Limpeza doméstica e empresarial", "Manutenção e reparações", "Construção e remodelação",
    "Canalização e eletricidade", "Pintura e decoração", "Mudanças e transporte de carga",
    "Transporte de passageiros", "Táxi e transfer", "Aluguer de equipamentos", "Assistência informática",
    "Reparação de telemóveis e computadores", "Instalação de câmaras e redes", "Marketing e publicidade",
    "Design e criação de conteúdos", "Contabilidade e apoio administrativo", "Consultoria empresarial",
    "Serviços jurídicos", "Aulas e explicações", "Formação profissional", "Cuidados ao domicílio",
    "Beleza e estética", "Organização de eventos", "Catering e festas", "Jardinagem e paisagismo",
    "Lavandaria e engomadoria", "Entregas e estafetas", "Outros serviços"
  ],
  "Turismo e Experiências": [
    "Passeios e excursões", "Visitas guiadas", "Tours culturais e históricos", "Trilhos e caminhadas",
    "Excursões à natureza", "Atividades marítimas", "Passeios de barco", "Pesca desportiva",
    "Mergulho e snorkeling", "Surf e desportos aquáticos", "Aluguer de caiaques",
    "Aluguer de equipamentos", "Experiências gastronómicas", "Experiências culturais",
    "Observação da natureza", "Transferes turísticos", "Outras experiências"
  ],
  "Agricultura e Pecuária": [
    "Produtos agrícolas", "Frutas e legumes", "Sementes e plantas", "Animais de criação",
    "Gado bovino", "Caprinos e ovinos", "Aves e criação", "Rações e alimentação animal",
    "Equipamentos agrícolas", "Tratores e alfaias", "Terrenos agrícolas", "Serviços agrícolas",
    "Pesca e produtos do mar", "Outros produtos e serviços rurais"
  ],
  "Máquinas e Equipamentos": [
    "Máquinas industriais", "Equipamentos de construção", "Máquinas agrícolas",
    "Ferramentas profissionais", "Equipamentos de oficina", "Equipamentos de restauração",
    "Equipamentos de escritório", "Equipamentos informáticos", "Geradores e energia",
    "Equipamentos de frio", "Equipamentos médicos", "Aluguer de máquinas",
    "Peças e acessórios", "Outras máquinas e equipamentos"
  ],
  "Desporto e Lazer": [
    "Bicicletas", "Equipamentos de ginásio", "Material desportivo", "Pesca e campismo",
    "Atividades ao ar livre", "Música e entretenimento", "Jogos e colecionismo",
    "Aulas e clubes desportivos", "Aluguer de equipamentos de lazer", "Outros desportos e lazer"
  ],
  "Oportunidades": [
    "Emprego", "Ofertas de trabalho", "Procura de emprego", "Trabalho temporário",
    "Estágios", "Formação e bolsas", "Parcerias comerciais", "Representações e distribuição",
    "Franchising", "Investimentos e projetos", "Negócios à venda", "Sociedades e participações",
    "Voluntariado", "Outras oportunidades"
  ],
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

function mapDatabaseListing(row: Record<string, unknown>): Listing {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    category: String(row.category ?? ""),
    subcategory: String(row.subcategory ?? ""),
    island: String(row.island ?? ""),
    municipality: String(row.municipality ?? ""),
    price: String(row.price ?? ""),
    description: String(row.description ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    phone: String(row.phone ?? ""),
    image: String(row.image_url ?? ""),
    ownerEmail: String(row.owner_email ?? ""),
    ownerAccountId: String(row.owner_id ?? ""),
    listingStatus: row.listing_status as ListingStatus,
    isFeatured: row.is_featured === true && (!row.featured_until || new Date(String(row.featured_until)).getTime() > Date.now()),
    paymentStatus: (row.payment_status ?? "pending") as PaymentStatus,
    paymentMethod: (row.payment_method ?? "free_launch") as PaymentMethod,
    proofRef: row.proof_ref ? String(row.proof_ref) : undefined,
    slotNumber: typeof row.slot_number === "number" ? row.slot_number : undefined,
    moderationNote: row.moderation_note ? String(row.moderation_note) : "",
    createdAt: String(row.created_at ?? ""),
  };
}


const QUICK_PROMPTS = [
  "Quero vender ou divulgar algo",
  "Procuro um produto ou serviço",
  "Como evitar burlas e anúncios falsos?",
];

type ListingGalleryProps = {
  title: string;
  images: { id: string; url: string }[];
  fallbackImage: string;
  onOpen: (src: string, images: { id: string; url: string }[], index: number) => void;
};

function ListingGallery({ title, images, fallbackImage, onOpen }: ListingGalleryProps) {
  const slides = images.length ? images : (fallbackImage ? [{ id: "cover", url: fallbackImage }] : []);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [title, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    return <div style={{ ...imageFrameStyle, display: "grid", placeItems: "center", color: "#8FA2BD" }}>Sem fotografia</div>;
  }

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <div style={{ ...imageFrameStyle, position: "relative" }}>
      <img
        key={slides[activeIndex].id}
        src={slides[activeIndex].url}
        alt={title + " — fotografia " + (activeIndex + 1)}
        onClick={() => onOpen(slides[activeIndex].url, slides, activeIndex)}
        style={{ ...cardImageStyle, animation: "conecta-gallery-fade .55s ease both" }}
      />
      {slides.length > 1 && (
        <>
          <button type="button" aria-label="Fotografia anterior" onClick={() => move(-1)} style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, minHeight: 0, padding: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,.3)", background: "rgba(7,11,24,.48)", color: "#fff", fontSize: 14, lineHeight: 1, cursor: "pointer", display: "grid", placeItems: "center" }}>‹</button>
          <button type="button" aria-label="Fotografia seguinte" onClick={() => move(1)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, minHeight: 0, padding: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,.3)", background: "rgba(7,11,24,.48)", color: "#fff", fontSize: 14, lineHeight: 1, cursor: "pointer", display: "grid", placeItems: "center" }}>›</button>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" aria-label={"Ver fotografia " + (index + 1)} onClick={() => setActiveIndex(index)} style={{ width: index === activeIndex ? 10 : 3, height: 3, minHeight: 0, padding: 0, border: 0, borderRadius: 99, background: index === activeIndex ? "#fff" : "rgba(255,255,255,.58)", cursor: "pointer", transition: "all .2s ease" }} />
            ))}
          </div>
          <span style={{ position: "absolute", top: 6, right: 6, padding: "2px 5px", borderRadius: 99, background: "rgba(7,11,24,.72)", color: "#fff", fontSize: 11, fontWeight: 650 }}>{activeIndex + 1}/{slides.length}</span>
        </>
      )}
      <style>{`@keyframes conecta-gallery-fade { from { opacity: .55; transform: scale(1.015); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

function ListingDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.trim().length > 150;
  return (
    <div style={{ margin: "0.15rem 0 0.35rem" }}>
      <p style={{ margin: 0, fontSize: "0.86rem", color: "#B5C3D8", lineHeight: 1.5, ...(isLong && !expanded ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden" } : {}) }}>
        {description}
      </p>
      {isLong && (
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} style={{ marginTop: 5, padding: 0, border: 0, background: "transparent", color: "#7DB4FF", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
          {expanded ? "Ler menos" : "Ler mais"}
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<"home" | "publish" | "account" | "admin" | "requests">("home");
  const [procurementFocus, setProcurementFocus] = useState<{ requestId: string; offerId?: string } | null>(null);
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [featuredPromotions, setFeaturedPromotions] = useState<Array<{ id: string; listing_id: string; owner_id: string; amount_cve: number; duration_days: number; status: string; bank?: "BCA" | "BCN" | null; payment_code?: string | null; payment_reference: string | null; admin_note: string | null; created_at: string; featured_until: string | null }>>([]);
  const [featuredPromotionBusy, setFeaturedPromotionBusy] = useState<string | null>(null);
  const [featuredBank, setFeaturedBank] = useState<"BCA" | "BCN">("BCA");
  const [featuredSchemaAvailable, setFeaturedSchemaAvailable] = useState(false);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [canAdmin, setCanAdmin] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditableListingFields | null>(null);
  const [editFeedback, setEditFeedback] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaByListing, setMediaByListing] = useState<Record<string, { id: string; url: string; type: "image" | "video"; sort: number }[]>>({});

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      if (!active) return;
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) console.error("Falha ao recuperar sessão:", error.message);
      setAuthUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setAccountEmail(authUser?.email ?? "");
    setOwnerEmail(authUser?.email ?? "");
    setCanAdmin(false);
    let active = true;
    async function loadSharedListings() {
      const { data, error } = await supabase
        .from(authUser ? "listings" : "public_listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        console.error("Falha ao carregar anúncios do servidor:", error.message);
        return;
      }
      const loadedListings = (data ?? []).map((row) => mapDatabaseListing(row as Record<string, unknown>));
      setListings(loadedListings);
      if (authUser) {
        const { error: featuredColumnError } = await supabase.from("listings").select("is_featured").limit(1);
        if (active) setFeaturedSchemaAvailable(!featuredColumnError);
      }
      if (loadedListings.length) {
        const { data: mediaRows } = await supabase.from("listing_media").select("id, listing_id, media_url, media_type, sort_order").in("listing_id", loadedListings.map((item) => item.id));
        if (active && mediaRows) {
          const grouped: typeof mediaByListing = {};
          for (const media of mediaRows) {
            const key = String(media.listing_id);
            (grouped[key] ||= []).push({ id: String(media.id), url: String(media.media_url), type: media.media_type as "image" | "video", sort: Number(media.sort_order) });
          }
          setMediaByListing(grouped);
        }
      }
    }
    async function loadAccountRole() {
      if (!authUser) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("role, account_state")
        .eq("id", authUser.id)
        .maybeSingle();
      if (!active || error || !data) return;
      setCanAdmin(data.account_state === "active" && ["master", "moderator"].includes(data.role));
    }
    loadSharedListings();
    loadAccountRole();
    return () => { active = false; };
  }, [authUser]);

  const [marketplaceCategoryOptions, setMarketplaceCategoryOptions] = useState<{ category_name: string; subcategory_name: string | null }[]>([]);

  const accountListings = useMemo(
    () => authUser ? getPreviewListingsByEmail(listings, authUser.email ?? "") : [],
    [listings, authUser]
  );
  const accountListingCounts = useMemo(
    () => countListingsByStatus(accountListings),
    [accountListings]
  );

  useEffect(() => {
    let active = true;
    async function loadFeaturedPromotions() {
      if (!authUser) { setFeaturedPromotions([]); return; }
      const { data, error } = await supabase.from("listing_featured_promotions").select("id, listing_id, owner_id, amount_cve, duration_days, status, bank, payment_code, payment_reference, admin_note, created_at, featured_until").order("created_at", { ascending: false });
      if (!active) return;
      if (error) { console.error("Falha ao carregar pedidos de destaque:", error.message); return; }
      setFeaturedPromotions((data ?? []) as typeof featuredPromotions);
    }
    void loadFeaturedPromotions();
    return () => { active = false; };
  }, [authUser, canAdmin]);

  const availableCategories = useMemo(
    () => Array.from(new Set([
      ...Object.keys(CATEGORIES),
      ...marketplaceCategoryOptions.map((item) => item.category_name),
    ])).sort((a, b) => a.localeCompare(b, "pt")),
    [marketplaceCategoryOptions]
  );

  function getCategorySubcategories(categoryName: string): string[] {
    return Array.from(new Set([
      ...(CATEGORIES[categoryName] || []),
      ...marketplaceCategoryOptions
        .filter((item) => item.category_name === categoryName && item.subcategory_name)
        .map((item) => item.subcategory_name as string),
    ])).sort((a, b) => a.localeCompare(b, "pt"));
  }

  useEffect(() => {
    let active = true;
    async function loadMarketplaceCategories() {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("category_name, subcategory_name")
        .eq("is_active", true);
      if (!active) return;
      if (error) {
        console.error("Não foi possível carregar as categorias aprovadas:", error.message);
        return;
      }
      setMarketplaceCategoryOptions((data ?? []) as { category_name: string; subcategory_name: string | null }[]);
    }
    loadMarketplaceCategories();
    return () => { active = false; };
  }, []);

  // Filtros públicos (apenas anúncios publicados)
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [island, setIsland] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [lightbox, setLightbox] = useState<{ src: string; title: string; images: { id: string; url: string }[]; index: number } | null>(null);
  const lightboxTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("fraude");
  const [reportDetails, setReportDetails] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClockNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowRight" && lightbox.images.length > 1) {
        setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.images.length, src: current.images[(current.index + 1) % current.images.length].url } : null);
      }
      if (event.key === "ArrowLeft" && lightbox.images.length > 1) {
        setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length, src: current.images[(current.index - 1 + current.images.length) % current.images.length].url } : null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox?.images.length, Boolean(lightbox)]);

  // Formulário de publicação
  const [title, setTitle] = useState("");
  const [pubCategory, setPubCategory] = useState("Imóveis");
  const [pubSubcategory, setPubSubcategory] = useState("Moradias");
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [useCustomSubcategory, setUseCustomSubcategory] = useState(false);
  const [pubIsland, setPubIsland] = useState("Santiago");
  const [pubMunicipality, setPubMunicipality] = useState("Tarrafal");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("free_launch");
  const [publicationPlan, setPublicationPlan] = useState<"normal" | "premium">("normal");
  const [proofRef, setProofRef] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [publicationPreviewOpen, setPublicationPreviewOpen] = useState(false);

  // Assistente flutuante
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Olá! 👋 Bem-vindo ao CaboVerde Conecta. Sou o assistente virtual e estou aqui para ajudar a divulgar os seus anúncios e serviços, esclarecer dúvidas sobre a campanha de lançamento e explicar como encontrar ou contactar anunciantes. Como posso ajudar hoje?",
    },
  ]);

  useEffect(() => {
    if (chatOpen) chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatLoading, chatOpen]);

  const totalFreeSlots = 50;
  // Ativar apenas depois de validar e publicar o fluxo de cobrança.
  const paidListingsEnabled = true;
  const [usedFreeSlots, setUsedFreeSlots] = useState(0);
  const freeSlotsRemaining = Math.max(0, totalFreeSlots - usedFreeSlots);
  const canClaimFreeSlot = freeSlotsRemaining > 0;

  useEffect(() => {
    setPaymentMethod(canClaimFreeSlot ? "free_launch" : "bank_transfer");
  }, [canClaimFreeSlot]);

  useEffect(() => {
    let active = true;
    async function loadCampaignStatus() {
      const { data, error } = await supabase.rpc("get_launch_campaign_status");
      if (!active) return;
      if (error) {
        console.error("Falha ao consultar as vagas da campanha:", error.message);
        return;
      }
      setUsedFreeSlots(Number(data?.used ?? 0));
    }
    loadCampaignStatus();
    return () => { active = false; };
  }, [listings]);

  const publicListings = useMemo(() => {
    const parsePrice = (value: string) => {
      const digits = value.replace(/[^0-9]/g, "");
      return digits ? Number(digits) : null;
    };
    const min = minPrice.trim() ? parsePrice(minPrice) : null;
    const max = maxPrice.trim() ? parsePrice(maxPrice) : null;
    const filtered = listings.filter((ad) => {
      if (ad.listingStatus !== "published") return false;
      if (category && ad.category !== category) return false;
      if (subcategory && ad.subcategory !== subcategory) return false;
      if (island && ad.island !== island) return false;
      if (municipality && ad.municipality !== municipality) return false;
      if (query.trim()) {
        const match = getSearchMatch(query, [ad.title, ad.description, ad.category, ad.subcategory, ad.island, ad.municipality]);
        if (match === "none") return false;
      }
      const numericPrice = parsePrice(ad.price);
      if (min !== null && (numericPrice === null || numericPrice < min)) return false;
      if (max !== null && (numericPrice === null || numericPrice > max)) return false;
      return true;
    });
    filtered.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (query.trim()) {
        const aMatch = getSearchMatch(query, [a.title, a.description, a.category, a.subcategory]);
        const bMatch = getSearchMatch(query, [b.title, b.description, b.category, b.subcategory]);
        if (aMatch !== bMatch) return aMatch === "exact" ? -1 : 1;
      }
      if (sortOrder === "low" || sortOrder === "high") {
        const pa = parsePrice(a.price), pb = parsePrice(b.price);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return sortOrder === "low" ? pa - pb : pb - pa;
      }
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return filtered;
  }, [listings, category, subcategory, island, municipality, query, minPrice, maxPrice, sortOrder]);

  async function requestFeaturedPromotion(item: Listing) {
    if (!authUser || item.ownerAccountId !== authUser.id || item.listingStatus !== "published") {
      setEditFeedback("Entre na sua conta e escolha um anúncio seu que esteja publicado.");
      return;
    }
    const alreadyOpen = featuredPromotions.some((promotion) => promotion.listing_id === item.id && ["pending_payment", "active"].includes(promotion.status));
    if (alreadyOpen || item.isFeatured) { setEditFeedback("Este anúncio já tem um pedido pendente ou um destaque ativo."); return; }
    setFeaturedPromotionBusy(item.id);
    const { error } = await supabase.rpc("request_listing_featured_promotion", { p_listing_id: item.id, p_bank: featuredBank });
    setFeaturedPromotionBusy(null);
    if (error) { setEditFeedback("Não foi possível solicitar o destaque: " + error.message); return; }
    const { data, error: reloadError } = await supabase.from("listing_featured_promotions").select("id, listing_id, owner_id, amount_cve, duration_days, status, bank, payment_code, payment_reference, admin_note, created_at, featured_until").order("created_at", { ascending: false });
    if (!reloadError) setFeaturedPromotions((data ?? []) as typeof featuredPromotions);
    setEditFeedback("Pedido registado. Valor: 1.000 CVE para atualizar o anúncio para Premium durante 30 dias. O destaque só será ativado após confirmação manual do pagamento pela equipa.");
  }

  async function reviewFeaturedPromotion(promotionId: string, decision: "confirm" | "reject") {
    if (!authUser || !canAdmin) return;
    let paymentReference: string | null = null;
    if (decision === "confirm") {
      if (!window.confirm("Confirma que recebeu e verificou o pagamento deste pedido de " + (featuredPromotions.find((entry) => entry.id === promotionId)?.amount_cve ?? 0).toLocaleString("pt-PT") + " CVE?")) return;
      paymentReference = window.prompt("Referência do pagamento/comprovativo (opcional):")?.trim().slice(0, 200) || null;
    } else if (!window.confirm("Tem a certeza de que pretende rejeitar este pedido de destaque?")) return;
    const promotion = featuredPromotions.find((entry) => entry.id === promotionId);
    setFeaturedPromotionBusy(promotionId);
    const { error } = await supabase.rpc("review_listing_featured_promotion", { p_promotion_id: promotionId, p_decision: decision, p_payment_reference: paymentReference, p_admin_note: null, p_bank: featuredPromotions.find((entry) => entry.id === promotionId)?.bank ?? null });
    setFeaturedPromotionBusy(null);
    if (error) { setFeedback("Não foi possível rever o pedido: " + error.message); return; }
    const { data, error: reloadError } = await supabase.from("listing_featured_promotions").select("id, listing_id, owner_id, amount_cve, duration_days, status, bank, payment_code, payment_reference, admin_note, created_at, featured_until").order("created_at", { ascending: false });
    if (!reloadError) setFeaturedPromotions((data ?? []) as typeof featuredPromotions);
    if (decision === "confirm" && promotion) {
      const { data: listingData } = await supabase.from("listings").select("*").eq("id", promotion.listing_id).maybeSingle();
      if (listingData) setListings((previous) => previous.map((item) => item.id === promotion.listing_id ? mapDatabaseListing(listingData as Record<string, unknown>) : item));
    }
    setFeedback(decision === "confirm" ? "Pagamento confirmado. O destaque foi ativado por 30 dias." : "Pedido de destaque rejeitado.");
  }

  function addAudit(entry: string) {
    setAuditLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${entry}`, ...prev]);
  }

  async function sendChatMessage(customText?: string) {
    const content = (customText ?? chatInput).trim();
    if (!content || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: content,
    };
    const history = [...messages.filter((message) => message.id !== "welcome"), userMsg]
      .slice(-8)
      .map((message) => ({
        role: message.sender === "user" ? "user" as const : "assistant" as const,
        content: message.text,
      }));

    setMessages((previous) => [...previous, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json().catch(() => ({})) as { reply?: string; error?: string };
      if (!response.ok || typeof result.reply !== "string" || !result.reply.trim()) {
        throw new Error(result.error || "Não foi possível obter uma resposta neste momento.");
      }
      setMessages((previous) => [...previous, {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: result.reply!.trim(),
      }]);
    } catch (error) {
      const message = error instanceof Error && error.name === "TimeoutError"
        ? "A resposta está a demorar mais do que o esperado. Verifique a ligação e tente novamente."
        : error instanceof Error && error.message
          ? error.message
          : "O assistente está temporariamente indisponível. Verifique a ligação e tente novamente.";
      setMessages((previous) => [...previous, {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: message,
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handlePublishSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setFeedback("");
    setSubmissionSuccess(false);
    if (!authUser) {
      setFeedback("Para publicar um anúncio, entre na sua conta ou crie uma conta em Minha Conta.");
      setTab("account");
      return;
    }

    if (!title.trim() || title.trim().length > 100) {
      setFeedback("Indique o nome do anúncio (máximo de 100 caracteres).");
      return;
    }
    if (price.trim().length > 60) {
      setFeedback("O preço ou valor não pode ultrapassar 60 caracteres.");
      return;
    }
    if (!pubIsland || !LOCATIONS[pubIsland]?.includes(pubMunicipality)) {
      setFeedback("Selecione uma ilha e um concelho válidos.");
      return;
    }
    const cleanWhatsApp = whatsapp.replace(/\D/g, "");
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanWhatsApp && !cleanPhone) {
      setFeedback("Indique pelo menos um contacto: WhatsApp ou telefone.");
      return;
    }
    if ((cleanWhatsApp && (cleanWhatsApp.length < 7 || cleanWhatsApp.length > 15)) ||
        (cleanPhone && (cleanPhone.length < 7 || cleanPhone.length > 15))) {
      setFeedback("Os contactos devem conter entre 7 e 15 dígitos, incluindo o indicativo do país quando aplicável.");
      return;
    }
    if (description.trim().length > 3000) {
      setFeedback("A descrição não pode ultrapassar 3.000 caracteres.");
      return;
    }
    if (imageUrl.trim()) {
      try {
        const parsedImageUrl = new URL(imageUrl.trim());
        if (parsedImageUrl.protocol !== "https:") throw new Error("HTTPS required");
      } catch {
        setFeedback("A fotografia deve utilizar um endereço HTTPS válido.");
        return;
      }
    }
    if (!mediaFiles.some((file) => file.type.startsWith("image/")) && !imageUrl.trim()) {
      setFeedback("Adicione pelo menos uma fotografia do anúncio.");
      return;
    }

    if (paymentMethod === "bank_transfer" && !paidListingsEnabled) {
      setFeedback("As 50 vagas gratuitas já foram preenchidas. Os pagamentos ainda não estão ativos; não faça transferências. Neste momento não é possível submeter novos anúncios pagos.");
      return;
    }
    if (paymentMethod === "free_launch" && !canClaimFreeSlot) {
      setFeedback("As 50 vagas gratuitas já foram preenchidas. Atualize a página para consultar a modalidade de pagamento.");
      return;
    }
    if (paymentMethod === "bank_transfer" && canClaimFreeSlot) {
      setFeedback("Ainda existem vagas gratuitas disponíveis. A publicação deve utilizar a campanha gratuita.");
      return;
    }

    setIsSubmitting(true);
    const submitArgs = {
      p_title: title.trim(),
      p_category: (useCustomCategory ? customCategory.trim() : pubCategory) || "Outros",
      p_subcategory: (useCustomCategory || useCustomSubcategory ? customSubcategory.trim() : pubSubcategory) || "Geral",
      p_island: pubIsland,
      p_municipality: pubMunicipality,
      p_price: price.trim() || "Preço sob consulta",
      p_description: description.trim(),
      p_whatsapp: cleanWhatsApp,
      p_phone: cleanPhone,
      p_image_url: imageUrl.trim(),
    };
    const { data, error } = paymentMethod === "free_launch"
      ? await supabase.rpc("submit_listing", submitArgs)
      : await supabase.rpc("submit_paid_listing", { ...submitArgs, p_is_featured: publicationPlan === "premium" });

    if (error) {
      const message = error.message.includes("CAMPAIGN_FULL_PAYMENT_NOT_AVAILABLE")
        ? "As 50 vagas gratuitas já foram preenchidas. Atualize a página para continuar com o pagamento."
        : error.message.includes("FREE_CAMPAIGN_STILL_AVAILABLE")
          ? "Ainda existem vagas gratuitas. A campanha deve ser aplicada automaticamente."
          : "Não foi possível enviar o anúncio ao servidor: " + error.message;
      setFeedback(message);
      setIsSubmitting(false);
      return;
    }

    const newAd = mapDatabaseListing(data as Record<string, unknown>);
    const uploadedMedia: { url: string; type: "image" | "video"; sort: number }[] = [];
    for (const [index, file] of mediaFiles.entries()) {
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90);
      const objectPath = `${authUser.id}/${newAd.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("listing-media").upload(objectPath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadError) {
        setFeedback(`O anúncio foi criado como pendente, mas o carregamento de ficheiros falhou: ${uploadError.message}. Pode tentar adicionar os ficheiros novamente em Minha Conta.`);
        setListings((prev) => [newAd, ...prev]);
        setIsSubmitting(false);
        return;
      }
      const { data: publicData } = supabase.storage.from("listing-media").getPublicUrl(objectPath);
      uploadedMedia.push({ url: publicData.publicUrl, type: file.type.startsWith("video/") ? "video" : "image", sort: index });
    }
    if (uploadedMedia.length) {
      const rows = uploadedMedia.map((media) => ({ listing_id: newAd.id, owner_id: authUser.id, media_url: media.url, media_type: media.type, sort_order: media.sort }));
      const { error: mediaInsertError } = await supabase.from("listing_media").insert(rows);
      if (mediaInsertError) {
        setFeedback(`O anúncio foi criado, mas não foi possível associar a galeria: ${mediaInsertError.message}. Contacte o suporte antes de repetir a publicação.`);
        setListings((prev) => [newAd, ...prev]);
        setIsSubmitting(false);
        return;
      }
      setMediaByListing((prev) => ({ ...prev, [newAd.id]: uploadedMedia.map((media, index) => ({ id: `pending-${index}`, ...media })) }));
      const firstImage = uploadedMedia.find((media) => media.type === "image");
      if (firstImage) {
        await supabase.from("listings").update({ image_url: firstImage.url }).eq("id", newAd.id).eq("owner_id", authUser.id);
        newAd.image = firstImage.url;
      }
    }
    const { data: refreshedListing } = await supabase.from("listings").select("*").eq("id", newAd.id).maybeSingle();
    const finalAd = refreshedListing ? mapDatabaseListing(refreshedListing as Record<string, unknown>) : newAd;
    setListings((prev) => [finalAd, ...prev]);
    if (paymentMethod === "free_launch") {
      setUsedFreeSlots((current) => Math.max(current, newAd.slotNumber ?? current));
      addAudit(`Anúncio ${newAd.id} enviado ao servidor e recebeu a vaga gratuita #${newAd.slotNumber}.`);
    } else {
      addAudit(`Anúncio ${newAd.id} submetido com pagamento por transferência pendente de validação.`);
    }
    setTitle("");
    setPublicationPlan("normal");
    setPrice("");
    setDescription("");
    setProofRef("");
    setCustomCategory("");
    setCustomSubcategory("");
    setUseCustomCategory(false);
    setUseCustomSubcategory(false);
    setMediaFiles([]);
    setFeedback(finalAd.listingStatus === "published" ? "Anúncio publicado automaticamente! A equipa poderá analisá-lo e pedir melhorias, se necessário." : "Anúncio recebido. Será publicado assim que a fotografia estiver carregada e o pagamento confirmado.");
    setIsSubmitting(false);
    setSubmissionSuccess(true);
  }

  function beginListingEdit(item: Listing) {
    setEditingListingId(item.id);
    setEditDraft({
      title: item.title,
      category: item.category,
      subcategory: item.subcategory,
      island: item.island,
      municipality: item.municipality,
      price: item.price,
      description: item.description,
      whatsapp: item.whatsapp,
      phone: item.phone,
      image: item.image,
    });
    setEditFeedback("");
  }

  async function saveListingEdit(e: React.FormEvent, item: Listing) {
    e.preventDefault();
    if (!editDraft || !authUser) return;
    if (item.ownerAccountId !== authUser.id) {
      setEditFeedback("Não foi possível confirmar a propriedade deste anúncio.");
      return;
    }
    if (item.listingStatus === "rejected") {
      setEditFeedback("Anúncios rejeitados não podem ser editados.");
      return;
    }
    const result = validateListingEdit(editDraft);
    if (result.ok === false) {
      setEditFeedback(result.errors.join(" "));
      return;
    }
    const { error } = await supabase.from("listings").update({
      title: result.value.title,
      category: result.value.category,
      subcategory: result.value.subcategory,
      island: result.value.island,
      municipality: result.value.municipality,
      price: result.value.price,
      description: result.value.description,
      whatsapp: result.value.whatsapp,
      phone: result.value.phone,
      image_url: result.value.image,
    }).eq("id", item.id).eq("owner_id", authUser.id);
    if (error) {
      setEditFeedback("Não foi possível guardar as alterações: " + error.message);
      return;
    }
    setListings((prev) => prev.map((current) =>
      current.id === item.id ? applyListingEdit(current, result.value) : current
    ));
    addAudit(`Anúncio ${item.id} atualizado no servidor; estados de pagamento e publicação preservados.`);
    setEditingListingId(null);
    setEditDraft(null);
    setEditFeedback("Alterações guardadas no servidor.");
  }

  async function updatePaymentAndListing(
    id: string,
    nextPayment: PaymentStatus,
    nextListing: ListingStatus,
    moderationNote?: string
  ) {
    if (!authUser || !canAdmin) return;
    const { error } = await supabase.from("listings").update({
      payment_status: nextPayment,
      listing_status: nextListing,
      ...(moderationNote ? { moderation_note: moderationNote } : {}),
    }).eq("id", id);
    if (error) {
      setFeedback("Ação administrativa não concluída: " + error.message);
      return;
    }
    setListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, paymentStatus: nextPayment, listingStatus: nextListing, moderationNote: moderationNote || item.moderationNote }
          : item
      )
    );
    const action = `payment=${nextPayment}; listing=${nextListing}`;
    await supabase.from("audit_logs").insert({
      actor_id: authUser.id,
      listing_id: id,
      action: "listing_moderation",
      details: { payment_status: nextPayment, listing_status: nextListing, moderation_note: moderationNote || null },
    });
    addAudit(`Ação administrativa gravada no servidor em ${id}: ${action}${moderationNote ? "; motivo: " + moderationNote : ""}.`);
  }

  function suspendListing(item: Listing) {
    const reason = window.prompt("Indique ao anunciante o que deve melhorar antes de voltar a publicar:");
    if (!reason?.trim()) return;
    void updatePaymentAndListing(item.id, item.paymentStatus, "suspended", reason.trim().slice(0, 1000));
  }

  async function republishListing(item: Listing) {
    if (!authUser || item.ownerAccountId !== authUser.id || item.listingStatus !== "suspended") return;
    const { error } = await supabase.from("listings").update({ listing_status: "published" }).eq("id", item.id).eq("owner_id", authUser.id);
    if (error) { setEditFeedback("Não foi possível voltar a publicar. Confirme fotografia, localização e contacto: " + error.message); return; }
    setListings((previous) => previous.map((current) => current.id === item.id ? { ...current, listingStatus: "published" } : current));
    setEditFeedback("O anúncio voltou a estar publicado.");
  }

  async function toggleListingFeatured(item: Listing) {
    if (!authUser || !canAdmin) return;
    if (!featuredSchemaAvailable) {
      setFeedback("O destaque premium está preparado, mas aguarda a ativação da migração no ambiente de teste.");
      return;
    }
    if (item.listingStatus !== "published") {
      setFeedback("Só é possível destacar anúncios publicados.");
      return;
    }

    const nextFeatured = !item.isFeatured;
    const { data, error } = await supabase
      .from("listings")
      .update({ is_featured: nextFeatured, featured_until: nextFeatured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null, ...(nextFeatured ? { expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } : {}) })
      .eq("id", item.id)
      .select("is_featured")
      .maybeSingle();

    if (error || !data) {
      setFeedback("Não foi possível atualizar o destaque: " + (error?.message || "anúncio não encontrado ou sem permissão."));
      return;
    }

    setListings((previous) => previous.map((current) =>
      current.id === item.id ? { ...current, isFeatured: data.is_featured === true } : current
    ));
    const action = nextFeatured ? "recebeu destaque premium" : "perdeu o destaque premium";
    addAudit(`Anúncio ${item.id} ${action} por ${authUser.email || "administrador"}.`);
    setFeedback(nextFeatured ? "Destaque premium ativado." : "Destaque premium removido.");
  }

  async function deleteListingAsAdmin(item: Listing) {
    if (!authUser || !canAdmin) return;
    const confirmed = window.confirm(
      `Tem a certeza de que pretende eliminar definitivamente o anúncio “${item.title}”? O anúncio e as respetivas fotografias/vídeos serão removidos. Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    const { data: mediaRows, error: mediaReadError } = await supabase
      .from("listing_media")
      .select("media_url")
      .eq("listing_id", item.id);
    if (mediaReadError) {
      setFeedback("Não foi possível preparar a eliminação dos ficheiros do anúncio: " + mediaReadError.message);
      return;
    }

    const objectPaths = (mediaRows ?? []).flatMap((row) => {
      const marker = "/listing-media/";
      const url = String(row.media_url ?? "");
      const index = url.indexOf(marker);
      if (index < 0) return [];
      const path = url.slice(index + marker.length).split("?")[0];
      try { return [decodeURIComponent(path)]; } catch { return [path]; }
    });
    if (objectPaths.length) {
      const { error: storageError } = await supabase.storage.from("listing-media").remove(objectPaths);
      if (storageError) {
        setFeedback("Não foi possível remover as fotografias/vídeos. O anúncio foi mantido: " + storageError.message);
        return;
      }
    }

    const { error } = await supabase.from("listings").delete().eq("id", item.id);
    if (error) {
      setFeedback("Não foi possível eliminar o anúncio: " + error.message);
      return;
    }

    setListings((previous) => previous.filter((listing) => listing.id !== item.id));
    setMediaByListing((previous) => {
      const next = { ...previous };
      delete next[item.id];
      return next;
    });
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_id: authUser.id,
      listing_id: item.id,
      action: "listing_deleted",
      details: { title: item.title, owner_email: item.ownerEmail },
    });
    addAudit(`Anúncio ${item.id} eliminado pelo administrador, incluindo os respetivos ficheiros multimédia.`);
    if (auditError) console.error("Não foi possível gravar a auditoria da eliminação:", auditError.message);
  }

  const previewCategory = useCustomCategory ? customCategory.trim() : pubCategory;
  const previewSubcategory = useCustomCategory || useCustomSubcategory ? customSubcategory.trim() : pubSubcategory;
  const previewTitle = title.trim() || "O título do seu anúncio aparecerá aqui";
  const previewDescription = description.trim() || "A descrição que escrever será apresentada nesta área.";
  const previewContacts = [whatsapp.trim() && "WhatsApp", phone.trim() && "Telefone"].filter(Boolean).join(" · ") || "Adicione um contacto";

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
          <div className="site-brand" style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
            <img
              src="https://raw.githubusercontent.com/Jnivaldo/caboverde-conecta-v2/main/Logo%20caboverdeconecta.png"
              alt="Logótipo CaboVerde Conecta"
              width="88"
              height="88"
              style={{ width: "clamp(64px, 12vw, 88px)", height: "clamp(64px, 12vw, 88px)", objectFit: "contain", flex: "0 0 auto" }}
            />
            <div style={{ display: "grid", gap: ".28rem", minWidth: 0 }}>
              <strong className="site-brand-title">
                <span>CABOVERDE</span> <span>CONECTA</span>
              </strong>
              <div className="site-brand-campaign" style={{ fontSize: "0.82rem", color: "#38D6A0", fontWeight: 600 }}>
                Campanha de lançamento: até 50 anúncios gratuitos · Após campanha: 1.500 CVE
              </div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            {[
              { key: "account", label: "Minha Conta" },
              ...(authUser ? [{ key: "myListings", label: "Os Meus Anúncios" }] : []),
              { key: "home", label: "Início" },
              { key: "publish", label: "Publicar Anúncio" },
              { key: "requests", label: "Procuro & Ofereço" },
              ...(canAdmin ? [{ key: "admin", label: "Administração" }] : []),
            ].map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={item.key === "account" ? "account-nav-button" : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    if (item.key === "myListings") {
                      setTab("account");
                      window.setTimeout(() => document.getElementById("my-listings")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                    } else {
                      setTab(item.key as typeof tab);
                    }
                  }}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.7rem", flex: "1 1 100%", width: "100%", minHeight: 52, paddingTop: "0.55rem", borderTop: "1px solid rgba(181,195,216,0.14)", flexWrap: "nowrap", minWidth: 0, position: "relative", zIndex: 50 }}>
            <div
              role="status"
              aria-live="polite"
              title={authUser ? "A sua conta está autenticada" : "Ainda não iniciou sessão"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.48rem",
                padding: "0.48rem 0.72rem",
                borderRadius: 999,
                border: authUser ? "1px solid rgba(56,214,160,.42)" : "1px solid rgba(181,195,216,.2)",
                background: authUser ? "rgba(16,185,129,.12)" : "rgba(21,31,51,.72)",
                color: authUser ? "#6EE7B7" : "#B5C3D8",
                fontSize: "0.78rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: authLoading ? "#94A3B8" : authUser ? "#34D399" : "#94A3B8",
                  boxShadow: authUser && !authLoading ? "0 0 0 3px rgba(52,211,153,.14)" : "none",
                }}
              />
              {authLoading ? "A verificar sessão..." : authUser ? "Sessão iniciada" : "Não autenticado"}
            </div>
            <React.Suspense fallback={<span role="status" style={{ color: "#AFC0D6", fontSize: ".78rem" }}>A carregar notificações…</span>}><NotificationCenter userId={authUser?.id ?? null} onNavigate={(nextTab) => setTab(nextTab)} /></React.Suspense>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1.85rem 1.25rem 5rem" }}>
        {tab === "home" && (
          <>
            <section
              aria-label="Apresentação CaboVerde Conecta"
              style={{
                textAlign: "center",
                maxWidth: 1040,
                margin: "0 auto 1.8rem",
                padding: "1.1rem 0.5rem 0.25rem",
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.9rem", color: "#38D6A0", fontSize: "0.76rem", fontWeight: 800, letterSpacing: "0.19em", textTransform: "uppercase" }}>
                <span style={{ width: 28, height: 2, background: "#38D6A0", borderRadius: 99 }} />
                O mercado digital de Cabo Verde
                <span style={{ width: 28, height: 2, background: "#38D6A0", borderRadius: 99 }} />
              </div>
              <h1 style={{ margin: "0", color: "#F8FAFC", fontSize: "clamp(2.7rem, 8vw, 5.65rem)", lineHeight: 0.98, letterSpacing: "-0.065em", fontWeight: 900, textTransform: "uppercase" }}>
                <span style={{ display: "inline-block" }}>CABOVERDE</span>{" "}
                <span style={{ display: "inline-block", color: "#60A5FA" }}>CONECTA</span>
              </h1>
              <div style={{ width: 76, height: 4, margin: "1.05rem auto 0.95rem", borderRadius: 99, background: "#38D6A0" }} />
              <h2 style={{ margin: "0 auto 0.65rem", maxWidth: 850, color: "#F8FAFC", fontSize: "clamp(1.05rem, 2.5vw, 1.65rem)", lineHeight: 1.25, letterSpacing: "0.035em", fontWeight: 800, textTransform: "uppercase" }}>
                A plataforma de anúncios de Cabo Verde
              </h2>
              <p style={{ margin: "0 auto", maxWidth: 760, color: "#B5C3D8", fontSize: "clamp(0.9rem, 1.6vw, 1.02rem)", lineHeight: 1.65 }}>
                Imóveis, viaturas, produtos, serviços e oportunidades — tudo num só lugar.
              </p>
            </section>

            <React.Suspense fallback={<div style={{ minHeight: 260 }} />}>
              <HomeSearchSpotlight
                query={query}
                setQuery={setQuery}
                category={category}
                setCategory={setCategory}
                island={island}
                setIsland={setIsland}
                categories={availableCategories}
                islands={Object.keys(LOCATIONS)}
              />
            </React.Suspense>

            <section
              aria-label="Progresso da campanha de lançamento"
              style={{
                margin: "0 auto 1.5rem",
                padding: "clamp(1.05rem, 3vw, 1.55rem)",
                borderRadius: 18,
                border: "1px solid rgba(96,165,250,0.28)",
                background: "linear-gradient(125deg, #10182A 0%, #14233D 58%, #102A35 100%)",
                boxShadow: "0 18px 42px rgba(0,0,0,0.22)",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.7rem", flexWrap: "wrap", marginBottom: "1.15rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#38D6A0", fontSize: "0.75rem", fontWeight: 850, letterSpacing: "0.13em", textTransform: "uppercase" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: "#38D6A0", boxShadow: "0 0 12px rgba(56,214,160,.65)" }} />
                  Campanha de lançamento
                </div>
                <span style={{ padding: "0.38rem 0.72rem", borderRadius: 999, border: "1px solid rgba(56,214,160,.3)", background: "rgba(56,214,160,.09)", color: "#8EF0C8", fontSize: "0.76rem", fontWeight: 750 }}>
                  50 anúncios gratuitos
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.65rem", flexWrap: "wrap" }}>
                    <strong style={{ color: "#F8FAFC", fontSize: "clamp(3rem, 8vw, 4.5rem)", lineHeight: 0.95, letterSpacing: "-0.07em", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                      {freeSlotsRemaining}
                    </strong>
                    <span style={{ color: "#8EF0C8", fontSize: "clamp(1rem, 2.4vw, 1.25rem)", fontWeight: 800 }}>vagas gratuitas restantes</span>
                  </div>
                  <p style={{ margin: "0.55rem 0 0", color: "#B5C3D8", fontSize: "0.86rem", lineHeight: 1.55 }}>
                    Garanta uma das vagas de lançamento para publicar o seu anúncio gratuitamente.
                  </p>
                </div>

                <div style={{ flex: "1 1 270px", minWidth: 0, maxWidth: 440, width: "100%", padding: "1rem", borderRadius: 14, border: "1px solid rgba(181,195,216,0.14)", background: "rgba(7,11,24,.34)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.7rem" }}>
                    <span style={{ color: "#DCE7F5", fontSize: "0.84rem", fontWeight: 700 }}>Vagas já utilizadas</span>
                    <strong style={{ color: "#F8FAFC", fontSize: "1.05rem", fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>{usedFreeSlots} <span style={{ color: "#8FA2BD", fontSize: "0.82rem", fontWeight: 600 }}>/ {totalFreeSlots}</span></strong>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Progresso das vagas gratuitas utilizadas"
                    aria-valuemin={0}
                    aria-valuemax={totalFreeSlots}
                    aria-valuenow={Math.min(totalFreeSlots, usedFreeSlots)}
                    style={{ height: 11, borderRadius: 99, overflow: "hidden", background: "rgba(181,195,216,.15)", boxShadow: "inset 0 1px 3px rgba(0,0,0,.25)" }}
                  >
                    <div style={{ width: Math.min(100, (usedFreeSlots / totalFreeSlots) * 100) + "%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #38D6A0 0%, #60A5FA 100%)", transition: "width .55s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.55rem", color: "#8FA2BD", fontSize: "0.72rem" }}>
                    <span>0 vagas</span>
                    <span>{Math.round(Math.min(100, (usedFreeSlots / totalFreeSlots) * 100))}% preenchido</span>
                    <span>50 vagas</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.65rem", flexWrap: "wrap", borderTop: "1px solid rgba(181,195,216,0.13)", marginTop: "1.05rem", paddingTop: "0.85rem" }}>
                <span style={{ color: "#B5C3D8", fontSize: "0.78rem" }}>
                  <strong style={{ color: "#F8FAFC" }}>{listings.filter((item) => item.listingStatus === "published").length}</strong> anúncio(s) publicado(s) neste momento
                </span>
                <span style={{ color: "#9FB0C8", fontSize: "0.78rem" }}>Após a campanha: <strong style={{ color: "#F8FAFC" }}>1.500 CVE</strong> por anúncio</span>
              </div>
            </section>

            <React.Suspense fallback={<div style={{ minHeight: 80 }} />}><ProcuroHomeHighlights onOpen={(requestId) => { setProcurementFocus(requestId ? { requestId } : null); setTab("requests"); }} /></React.Suspense>

            <div
              className="listing-search-filters"
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
              <select
                className="filter-wide"
                aria-label="Categoria"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory("");
                }}
                style={inputStyle}
              >
                <option value="">Todas as categorias</option>
                {Array.from(new Set([...availableCategories, ...listings.map((item) => item.category).filter(Boolean)])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="filter-wide"
                aria-label="Subcategoria"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={!category}
                style={inputStyle}
              >
                <option value="">Todas as subcategorias</option>
                {(category ? Array.from(new Set([...getCategorySubcategories(category), ...listings.filter((item) => item.category === category).map((item) => item.subcategory).filter(Boolean)])) : []).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <select
                className="filter-half"
                aria-label="Ilha"
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
                className="filter-half"
                aria-label="Concelho"
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
              <input className="filter-half" type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Preço mínimo" aria-label="Preço mínimo" style={{ ...inputStyle, minWidth: 120 }} />
              <input className="filter-half" type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Preço máximo" aria-label="Preço máximo" style={{ ...inputStyle, minWidth: 120 }} />
              <select className="filter-half" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="Ordenar anúncios" style={inputStyle}>
                <option value="newest">Mais recentes</option>
                <option value="low">Preço mais baixo</option>
                <option value="high">Preço mais alto</option>
              </select>
              <button
                className="filter-half filter-clear"
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setSubcategory("");
                  setIsland("");
                  setMunicipality("");
                  setMinPrice("");
                  setMaxPrice("");
                  setSortOrder("newest");
                }}
                style={secondaryBtnStyle}
              >
                Limpar filtros
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.65rem" }}>
              {availableCategories.map((cat) => {
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

            <div id="public-listings-results" style={{ margin: "-0.85rem 0 1rem", color: "#9FB0C8", fontSize: "0.84rem", scrollMarginTop: 24 }} aria-live="polite">
              {publicListings.length} anúncio(s) no Marketplace
              {query.trim() && publicListings.some((ad) => getSearchMatch(query, [ad.title, ad.description, ad.category, ad.subcategory, ad.island, ad.municipality]) === "related") && <span style={{ display: "block", marginTop: ".4rem", color: "#FDE68A", lineHeight: 1.5 }}>{getRelatedSearchReason(query)} Os resultados exatos aparecem primeiro; as alternativas estão identificadas.</span>}
            </div>
            <React.Suspense fallback={<div style={{ minHeight: 40 }} />}><UnifiedProcurementSearch query={query} onOpenProcurement={(target) => { setProcurementFocus(target ?? null); setTab("requests"); }} /></React.Suspense>
            {publicListings.length === 0 ? (
              <div style={{ ...panelStyle, textAlign: "center", color: "#B5C3D8", padding: "2rem 1.25rem", border: "1px solid rgba(96,165,250,0.25)" }}>
                <div style={{ width: 54, height: 54, margin: "0 auto 0.9rem", borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.22)", fontSize: 24 }}>⌕</div>
                <strong style={{ color: "#F8FAFC", fontSize: "1.05rem" }}>{query || category || subcategory || island || municipality || minPrice || maxPrice ? "Nenhum anúncio do Marketplace corresponde aos filtros" : "Ainda não existem anúncios publicados"}</strong>
                <p style={{ margin: "0.55rem auto 1rem", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: 480 }}>
                  {query || category || subcategory || island || municipality || minPrice || maxPrice ? "Experimente alterar as palavras, aumentar o intervalo de preço ou retirar alguns filtros. Os resultados de Procuro & Ofereço, quando existirem, aparecem separadamente acima." : "Os anúncios aprovados aparecerão aqui. Entretanto, pode explorar Procuro & Ofereço para encontrar oportunidades."}
                </p>
                {(query || category || subcategory || island || municipality || minPrice || maxPrice) && <button type="button" onClick={() => { setQuery(""); setCategory(""); setSubcategory(""); setIsland(""); setMunicipality(""); setMinPrice(""); setMaxPrice(""); setSortOrder("newest"); }} style={secondaryBtnStyle}>Ver todos os anúncios</button>}
              </div>
            ) : (
              <>
              {publicListings.some((ad) => ad.isFeatured) && (
                <section className="premium-showcase" aria-label="Anúncios em Destaque">
                  <div className="premium-showcase-top">
                    <div>
                      <span className="premium-kicker"><span aria-hidden="true">✦</span> SELEÇÃO EXCLUSIVA</span>
                      <h2 className="premium-showcase-title">Destaques Premium</h2>
                      <p className="premium-showcase-subtitle">Oportunidades selecionadas com visibilidade especial no CaboVerde Conecta</p>
                    </div>
                    <span className="premium-showcase-mark">✦ PREMIUM</span>
                  </div>
                  {(() => {
                    const premiumListings = publicListings.filter((ad) => ad.isFeatured);
                    const carouselListings = premiumListings.length > 1 ? [...premiumListings, ...premiumListings] : premiumListings;
                    return (
                      <div className="premium-carousel" aria-label="Carrossel de anúncios Premium">
                        <div className={premiumListings.length > 1 ? "premium-showcase-track is-moving" : "premium-showcase-track"}>
                          {carouselListings.map((ad, index) => (
                      <article key={ad.id + "-" + index} className="premium-showcase-card" aria-hidden={index >= premiumListings.length}>
                        <div className="premium-showcase-media">
                          <ListingGallery
                            title={ad.title}
                            images={(mediaByListing[ad.id] || []).filter((media) => media.type === "image").sort((x, y) => x.sort - y.sort)}
                            fallbackImage={ad.image}
                            onOpen={(src, images, index) => setLightbox({ src, title: ad.title, images, index })}
                          />
                          <span className="premium-image-ribbon">✦ DESTAQUE PREMIUM</span>
                        </div>
                        <div className="premium-showcase-content">
                          <span className="premium-category">{ad.category}</span>
                          <h3>{ad.title}</h3>
                          <span className="premium-location">⌖ {ad.municipality}{ad.island ? ", " + ad.island : ""}</span>
                          <strong className="premium-price">{ad.price || "Preço sob consulta"}</strong>
                          <button type="button" onClick={() => setSelectedListing(ad)} className="premium-details-button">Ver anúncio completo <span aria-hidden="true">→</span></button>
                        </div>
                      </article>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}
              <div
                className="listing-card-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(275px, 1fr))",
                  gap: "1.2rem",
                }}
              >
              {publicListings.map((ad) => (
                <article key={ad.id} className={`listing-card${ad.isFeatured ? " listing-card-featured" : ""}`} style={cardStyle}>
                  <ListingGallery
                    title={ad.title}
                    images={(mediaByListing[ad.id] || []).filter((media) => media.type === "image").sort((a, b) => a.sort - b.sort)}
                    fallbackImage={ad.image}
                    onOpen={(src, images, index) => setLightbox({ src, title: ad.title, images, index })}
                  />
                  <div className="listing-card-content" style={{ padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.65rem", flex: 1 }}>
                    <div className="listing-card-categories" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ padding: "0.32rem 0.65rem", borderRadius: 999, background: "rgba(96,165,250,0.14)", border: "1px solid rgba(96,165,250,0.28)", color: "#BFDBFE", fontSize: "0.76rem", fontWeight: 750 }}>{ad.category}</span>
                      {ad.isFeatured && <span className="listing-featured-badge"><span aria-hidden="true">✦</span> EM DESTAQUE</span>}
                      {query.trim() && getSearchMatch(query, [ad.title, ad.description, ad.category, ad.subcategory, ad.island, ad.municipality]) === "related" && <span title={getRelatedSearchReason(query)} style={{ padding: ".3rem .58rem", borderRadius: 999, background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.38)", color: "#FDE68A", fontSize: ".7rem", fontWeight: 800 }}>Alternativa relacionada</span>}
                      {clockNow - new Date(ad.createdAt).getTime() < 86_400_000 && clockNow >= new Date(ad.createdAt).getTime() && <span style={{ padding: ".28rem .6rem", borderRadius: 999, background: "#FACC15", color: "#172033", fontSize: ".7rem", fontWeight: 900 }}>Novo anúncio</span>}
                      {ad.subcategory && <span style={{ color: "#9FB0C8", fontSize: "0.76rem" }}>{ad.subcategory}</span>}
                    </div>
                    <h2 className="listing-card-title" style={{ margin: 0, fontSize: "1.16rem", lineHeight: 1.4, color: "#F8FAFC", letterSpacing: "-0.01em" }}>{ad.title}</h2>
                    <div className="listing-card-location" style={{ display: "flex", alignItems: "center", gap: 6, color: "#B5C3D8", fontSize: "0.84rem" }}><span aria-hidden="true">📍</span><span>{ad.municipality}{ad.island ? ", " + ad.island : ""}</span></div>
                    <div className="listing-card-price" style={{ padding: "0.7rem 0.85rem", borderRadius: 11, background: "linear-gradient(135deg, rgba(56,214,160,0.12), rgba(96,165,250,0.08))", border: "1px solid rgba(56,214,160,0.2)" }}>
                      <strong style={{ color: "#5EEAD4", fontSize: "1.2rem", lineHeight: 1.3 }}>{ad.price || "Preço sob consulta"}</strong>
                    </div>
                    <ListingDescription description={ad.description} />
                    <button type="button" onClick={() => setSelectedListing(ad)} style={{ ...secondaryBtnStyle, width: "100%", marginTop: "0.15rem", borderColor: "rgba(96,165,250,0.4)", color: "#BFDBFE" }}>Ver detalhes do anúncio <span aria-hidden="true">→</span></button>
                    {(mediaByListing[ad.id] || []).some((media) => media.type === "video") && (
                      <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                        {(mediaByListing[ad.id] || []).filter((media) => media.type === "video").map((media) => (
                          <video key={media.id} src={media.url} controls style={{ width: 110, height: 76, objectFit: "cover", borderRadius: 7 }} />
                        ))}
                      </div>
                    )}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "0.55rem" }}>
                      {ad.whatsapp && (
                        <a
                          href={`https://api.whatsapp.com/send?phone=${ad.whatsapp.replace(/\D/g, "")}&text=${encodeURIComponent(
                            `Olá! Tenho interesse no anúncio "${ad.title}" publicado no CaboVerde Conecta. Categoria: ${ad.category}. Localização: ${ad.municipality}, ${ad.island}. ${ad.price ? `Preço anunciado: ${ad.price}. ` : ""}Gostaria de saber se ainda está disponível e obter mais informações. Obrigado(a)!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={whatsappBtnStyle}
                        >
                          Contactar via WhatsApp
                        </a>
                      )}
                      {ad.phone && (
                        <a href={`tel:${ad.phone.replace(/\D/g, "")}`} style={callLinkStyle}>
                          Ligar
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              </div>
              </>
            )}
          </>
        )}

        {tab === "requests" && (
          <React.Suspense fallback={<div role="status" style={{ color: "#AFC0D6", padding: "1rem" }}>A carregar Procuro & Ofereço…</div>}><ProcuroOfereco user={authUser} canAdmin={canAdmin} onAuthClick={() => setTab("account")} focusTarget={procurementFocus} /></React.Suspense>
        )}

        {tab === "publish" && (
          <section style={panelStyle}>
            <div style={{ marginBottom: "1.1rem" }}>
              <span style={eyebrowStyle("#8B5CF6")}>SUBMISSÃO DE ANÚNCIO</span>
              <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>Publicar Anúncio</h1>
              <p style={{ margin: 0, color: "#B5C3D8", fontSize: "0.92rem", lineHeight: 1.5 }}>
                Publique com apenas quatro elementos: nome, pelo menos uma fotografia, localização e contacto. Os anúncios gratuitos são publicados automaticamente; a equipa poderá analisá-los depois e pedir melhorias. O pagamento dos anúncios pagos continua sujeito a confirmação.
              </p>
            </div>

            {feedback && <div style={feedbackBoxStyle}>{feedback}</div>}
            {submissionSuccess && (
              <div role="status" aria-live="polite" style={{ position: "relative", overflow: "hidden", margin: "0.8rem 0 1rem", padding: "1.4rem", borderRadius: 16, border: "1px solid rgba(56,214,160,0.65)", background: "linear-gradient(135deg, #102D35 0%, #15233B 55%, #24204A 100%)", boxShadow: "0 16px 38px rgba(0,0,0,0.28)", textAlign: "center" }}>
                <style>{`@keyframes conecta-confetti-fall { 0% { transform: translateY(-12vh) rotate(0deg); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } } @keyframes conecta-success-pop { 0% { transform: scale(.82); opacity: 0; } 70% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
                <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 1000 }}>
                  {Array.from({ length: 42 }, (_, i) => <span key={i} style={{ position: "absolute", top: -18, left: `${(i * 37) % 100}%`, width: i % 3 === 0 ? 9 : 6, height: i % 3 === 0 ? 13 : 8, borderRadius: i % 2 ? "50%" : 2, background: ["#38D6A0", "#60A5FA", "#FBBF24", "#F472B6", "#C4B5FD"][i % 5], animation: `conecta-confetti-fall ${1.7 + (i % 5) * 0.18}s ease-out ${(i % 8) * 0.045}s forwards` }} />)}
                </div>
                <div style={{ position: "relative", zIndex: 1, animation: "conecta-success-pop .45s ease-out both" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 5 }}>🎉</div>
                  <strong style={{ display: "block", color: "#F8FAFC", fontSize: "1.18rem", marginBottom: 7 }}>Anúncio submetido com sucesso!</strong>
                  <p style={{ margin: "0 auto 0.9rem", maxWidth: 520, color: "#D7E6F4", lineHeight: 1.55, fontSize: "0.92rem" }}>{paymentMethod === "free_launch" ? "O anúncio fica visível imediatamente e recebe a indicação «Novo anúncio» durante 24 horas. A equipa poderá analisá-lo depois e, se precisar de melhorias, notificará o proprietário." : "O anúncio será publicado depois da confirmação do pagamento e da validação dos quatro elementos essenciais."}</p>
                  <button type="button" onClick={() => setSubmissionSuccess(false)} style={{ ...secondaryBtnStyle, borderColor: "rgba(56,214,160,0.55)" }}>Continuar</button>
                </div>
              </div>
            )}

            <form onSubmit={handlePublishSubmit} style={{ display: "grid", gap: "0.9rem" }}>
              <div style={subCardStyle}>
                <strong style={{ fontSize: "0.92rem", color: "#F8FAFC" }}>1. Dados Principais e Localização</strong>
                <input
                  type="text"
                  required
                  minLength={1}
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do anúncio (ex.: Moradia T2 no Tarrafal)"
                  style={inputStyle}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", color: "#94A3B8", fontSize: ".74rem", marginTop: "-.55rem" }}>
                  {title.length}/100 caracteres
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "0.65rem" }}>
                  <select
                    value={pubCategory}
                    disabled={useCustomCategory}
                    onChange={(e) => {
                      const nextCat = e.target.value;
                      if (nextCat === "__custom_category__") {
                        setUseCustomCategory(true);
                        setUseCustomSubcategory(false);
                        setCustomCategory("");
                        setCustomSubcategory("");
                        return;
                      }
                      setUseCustomCategory(false);
                      setCustomCategory("");
                      setPubCategory(nextCat);
                      setPubSubcategory(getCategorySubcategories(nextCat)[0] || "Geral");
                      setUseCustomSubcategory(false);
                      setCustomSubcategory("");
                    }}
                    style={{ ...inputStyle, opacity: 1 }}
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__custom_category__">＋ Outra categoria — escrever</option>
                  </select>
                  <button type="button" onClick={() => { setUseCustomCategory((v) => !v); setUseCustomSubcategory(false); setCustomCategory(""); setCustomSubcategory(""); }} style={{ ...inputStyle, cursor: "pointer", color: "#BFDBFE", border: "1px dashed #60A5FA", background: "rgba(37,99,235,0.10)", textAlign: "left", fontWeight: 650 }}>
                    {useCustomCategory ? "− Usar uma categoria da lista" : "+ Não encontrou a categoria? Adicionar outra"}
                  </button>
                  {useCustomCategory && (
                    <input type="text" maxLength={60} value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Escreva a nova categoria (ex.: Instrumentos náuticos)" style={inputStyle} />
                  )}
                  {!useCustomCategory && (
                    <>
                      <select value={pubSubcategory} disabled={useCustomSubcategory} onChange={(e) => setPubSubcategory(e.target.value)} style={{ ...inputStyle, opacity: useCustomSubcategory ? 0.55 : 1 }}>
                        {getCategorySubcategories(pubCategory).map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                      <button type="button" onClick={() => { setUseCustomSubcategory((v) => !v); setCustomSubcategory(""); }} style={{ ...inputStyle, cursor: "pointer", color: "#BFDBFE", border: "1px dashed #60A5FA", background: "rgba(37,99,235,0.10)", textAlign: "left", fontWeight: 650 }}>
                        {useCustomSubcategory ? "− Usar uma subcategoria da lista" : "+ Não encontrou o produto ou serviço? Adicionar outro"}
                      </button>
                    </>
                  )}
                  {(useCustomCategory || useCustomSubcategory) && (
                    <input type="text" maxLength={80} value={customSubcategory} onChange={(e) => setCustomSubcategory(e.target.value)} placeholder={useCustomCategory ? "Descreva o produto, subproduto ou serviço" : "Escreva o produto, subproduto ou serviço"} style={inputStyle} />
                  )}
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
                    placeholder="Preço ou valor (opcional — deixe em branco para preço sob consulta)"
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

                <div style={{ color: "#AFC0D6", fontSize: ".78rem" }}>Usaremos automaticamente o email da sua conta para gerir o anúncio. Não precisa de o preencher novamente.</div>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL da imagem (enquadrada em 4:3 com ampliação ao clicar)"
                  style={inputStyle}
                />

                <textarea
                  rows={4}
                  maxLength={3000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o imóvel, viatura, produto, serviço ou oportunidade..."
                  style={inputStyle}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", color: "#94A3B8", fontSize: ".74rem", marginTop: "-.55rem" }}>
                  {description.length}/3000 caracteres
                </div>
                {/* The preview is informational; server-side validation remains authoritative. */}
              </div>

              <div style={subCardStyle}>
                <strong style={{ fontSize: "0.92rem", color: "#F8FAFC" }}>2. Fotografias</strong>
                <p style={{ margin: 0, color: "#AFC0D6", fontSize: ".78rem" }}>É necessária pelo menos uma fotografia. Vídeos são opcionais.</p>
                <React.Suspense fallback={<span style={{ color: "#AFC0D6" }}>A carregar gestor de fotografias…</span>}><ListingMediaPicker files={mediaFiles} onChange={setMediaFiles} /></React.Suspense>
              </div>


              <div style={subCardStyle}>
                <strong style={{ fontSize: "0.92rem", color: "#F8FAFC" }}>3. Tipo de anúncio e preço</strong>
                {canClaimFreeSlot ? (
                  <>
                    <div style={{ color: "#86EFAC", fontSize: ".9rem", fontWeight: 750 }}>Campanha de lançamento: anúncio Normal gratuito para os primeiros 50.</div>
                    <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".82rem", lineHeight: 1.5 }}>Durante a campanha, os destaques Premium são atribuídos gratuitamente pela administração a anúncios selecionados.</p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, color: "#B5C3D8", fontSize: ".82rem" }}>Escolha uma das duas modalidades. Ambas têm duração de 30 dias.</p>
                    <label style={{ display: "flex", alignItems: "center", gap: ".7rem", border: publicationPlan === "normal" ? "2px solid #60A5FA" : "1px solid rgba(148,163,184,.3)", borderRadius: 11, padding: ".85rem", cursor: "pointer" }}>
                      <input type="radio" name="publicationPlan" value="normal" checked={publicationPlan === "normal"} onChange={() => setPublicationPlan("normal")} />
                      <span style={{ display: "grid", gap: ".15rem" }}><strong style={{ color: "#F8FAFC" }}>Anúncio Normal — 1.500 CVE</strong><span style={{ color: "#AFC0D6", fontSize: ".78rem" }}>Publicação durante 30 dias</span></span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: ".7rem", border: publicationPlan === "premium" ? "2px solid #D6B45A" : "1px solid rgba(148,163,184,.3)", borderRadius: 11, padding: ".85rem", cursor: "pointer" }}>
                      <input type="radio" name="publicationPlan" value="premium" checked={publicationPlan === "premium"} onChange={() => setPublicationPlan("premium")} />
                      <span style={{ display: "grid", gap: ".15rem" }}><strong style={{ color: "#FDE68A" }}>Anúncio Premium — 2.500 CVE</strong><span style={{ color: "#AFC0D6", fontSize: ".78rem" }}>Mais visibilidade e destaque durante 30 dias</span></span>
                    </label>
                    <p style={{ margin: 0, color: "#FDE68A", fontSize: ".78rem" }}>Depois de submeter, aceda a Minha Conta para gerar o código CVC e efetuar a transferência. A publicação fica pendente até à confirmação do pagamento e moderação.</p>
                  </>
                )}
              </div>

              <div style={{ ...subCardStyle, border: "1px solid rgba(96,165,250,.38)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".8rem", flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: "#F8FAFC", fontSize: ".95rem" }}>Pré-visualização do anúncio</strong>
                    <p style={{ margin: ".25rem 0 0", color: "#AFC0D6", fontSize: ".78rem" }}>Veja como os dados principais ficarão antes de publicar.</p>
                  </div>
                  <button type="button" onClick={() => setPublicationPreviewOpen((open) => !open)} style={{ ...secondaryBtnStyle, borderColor: "#60A5FA", color: "#BFDBFE" }}>
                    {publicationPreviewOpen ? "Ocultar pré-visualização" : "Ver pré-visualização"}
                  </button>
                </div>
                {publicationPreviewOpen && (
                  <article style={{ border: "1px solid rgba(96,165,250,.5)", borderRadius: 13, overflow: "hidden", background: "linear-gradient(145deg,#111D31,#0B1220)", display: "grid", gap: ".7rem", padding: "1rem" }}>
                    <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                      <span style={{ ...badgeStyle("#1D4ED8"), fontSize: ".72rem" }}>{previewCategory || "Categoria"}</span>
                      <span style={{ ...badgeStyle("#334155"), fontSize: ".72rem" }}>{previewSubcategory || "Subcategoria"}</span>
                    </div>
                    <h3 style={{ margin: 0, color: "#F8FAFC", fontSize: "1.12rem", lineHeight: 1.35 }}>{previewTitle}</h3>
                    <div style={{ color: "#93C5FD", fontSize: ".82rem", fontWeight: 700 }}>{pubMunicipality}, {pubIsland}</div>
                    <strong style={{ color: "#6EE7B7", fontSize: "1.05rem" }}>{price.trim() || "Preço a indicar"}</strong>
                    <p style={{ margin: 0, color: "#D3DEEC", fontSize: ".86rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{previewDescription}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap", borderTop: "1px solid rgba(181,195,216,.16)", paddingTop: ".65rem", color: "#AFC0D6", fontSize: ".78rem" }}>
                      <span>{previewContacts}</span>
                      <span>{mediaFiles.length} ficheiro(s) selecionado(s)</span>
                    </div>
                    <span style={{ color: "#FCD34D", fontSize: ".74rem", fontWeight: 750 }}>Pré-visualização privada · ainda não publicado</span>
                  </article>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} style={{ ...primaryBtnStyle, opacity: isSubmitting ? 0.72 : 1, cursor: isSubmitting ? "wait" : "pointer", minHeight: 48 }}>
                {isSubmitting ? "A publicar anúncio… Não feche esta página" : "Publicar Anúncio"}
              </button>
            </form>
          </section>
        )}

        {tab === "account" && (
          <section style={panelStyle}>
            {authUser && <React.Suspense fallback={<span style={{ color: "#AFC0D6" }}>A carregar pagamentos…</span>}><ListingPaymentsPanel userId={authUser.id} listings={accountListings} canAdmin={false} /></React.Suspense>}
            <span style={eyebrowStyle("#38D6A0")}>ÁREA DO ANUNCIANTE</span>
            <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>Minha Conta</h1>
            <p style={{ margin: "0 0 1.2rem", color: "#B5C3D8", fontSize: "0.92rem" }}>
              Entre na sua conta para consultar os anúncios associados ao seu perfil em qualquer dispositivo.
            </p>

            <div style={{ ...subCardStyle, maxWidth: 520, marginBottom: "1rem" }}>
              {authLoading ? (
                <span style={{ color: "#B5C3D8", fontSize: "0.88rem" }}>A verificar sessão segura...</span>
              ) : (
                <React.Suspense fallback={<span style={{ color: "#AFC0D6" }}>A carregar autenticação segura…</span>}><AuthPanel user={authUser} onSignedIn={(user) => { setAuthUser(user); setAccountEmail(user.email ?? ""); }} onSignedOut={() => { setAuthUser(null); setAccountEmail(""); setListings([]); }} /></React.Suspense>
              )}
            </div>

            {authUser && accountEmail.trim() && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))", gap: "0.65rem", marginBottom: "1rem" }}>
                {[
                  { label: "Total", value: accountListings.length, color: "#60A5FA" },
                  { label: "Pendentes", value: accountListingCounts.pending, color: "#FBBF24" },
                  { label: "Publicados", value: accountListingCounts.published, color: "#38D6A0" },
                  { label: "Suspensos / rejeitados", value: accountListingCounts.suspended + accountListingCounts.rejected, color: "#F87171" },
                ].map((item) => (
                  <div key={item.label} style={{ ...subCardStyle, gap: "0.2rem", padding: "0.75rem" }}>
                    <span style={{ color: "#B5C3D8", fontSize: "0.76rem" }}>{item.label}</span>
                    <strong style={{ color: item.color, fontSize: "1.35rem" }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {authUser && (
              <div id="my-listings" style={{ display: "grid", gap: "0.65rem", scrollMarginTop: "1.25rem", marginBottom: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div>
                    <span style={eyebrowStyle("#60A5FA")}>GESTÃO DO ANUNCIANTE</span>
                    <h2 style={{ margin: "0.2rem 0 0", fontSize: "1.35rem", color: "#F8FAFC" }}>Os Meus Anúncios</h2>
                    <p style={{ margin: "0.25rem 0 0", color: "#B5C3D8", fontSize: ".86rem" }}>Consulte estados, edite publicações e acompanhe os seus destaques.</p>
                  </div>
                  <span style={{ ...badgeStyle("#1D4ED8"), fontSize: ".82rem", padding: ".45rem .7rem" }}>{accountListings.length} anúncio(s)</span>
                </div>
              </div>
            )}
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {editFeedback && <div style={feedbackBoxStyle}>{editFeedback}</div>}
              {!authUser ? (
                <div style={subCardStyle}>
                  <strong>Entre para consultar os seus anúncios</strong>
                  <span style={{ color: "#B5C3D8", fontSize: "0.88rem" }}>
                    Crie uma conta e confirme o email. Os anúncios ficam associados à sua identidade autenticada.
                  </span>
                </div>
              ) : accountListings.length === 0 ? (
                <div style={subCardStyle}>
                  <strong>Nenhum anúncio associado a esta conta</strong>
                  <span style={{ color: "#B5C3D8", fontSize: "0.88rem" }}>
                    Quando submeter anúncios, poderá acompanhar aqui os estados de análise e publicação.
                  </span>
                </div>
              ) : (
                accountListings.map((item) => (
                  <div key={item.id} style={{ ...rowCardStyle, display: "grid", alignItems: "stretch" }}>
                    <div style={{ display: "flex", gap: "0.9rem", alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ width: 96, aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", backgroundColor: "#10182A" }}>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            onClick={() => setLightbox({ src: item.image, title: item.title, images: [{ id: "cover", url: item.image }], index: 0 })}
                            style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#B5C3D8", fontSize: "0.72rem" }}>
                            Sem imagem enviada
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 190 }}>
                        <strong style={{ fontSize: "1rem" }}>{item.id} · {item.title}</strong>
                        <div style={{ fontSize: "0.84rem", color: "#B5C3D8", marginTop: "0.2rem" }}>
                          {item.category} ({item.subcategory}) · {item.municipality}, {item.island} ·{" "}
                          <span style={{ color: "#38D6A0", fontWeight: 600 }}>{item.price}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
                      <span style={badgeStyle("#1D4ED8")}>Pagamento: {item.paymentStatus}</span>
                      <span style={badgeStyle("#6D28D9")}>Anúncio: {item.listingStatus}</span>
                    </div>

                    {item.listingStatus === "suspended" && item.moderationNote && <div style={{ color: "#FDE68A", fontSize: ".82rem" }}>Melhorias pedidas pela equipa: {item.moderationNote}</div>}
                    {canClaimFreeSlot && item.isFeatured && item.listingStatus === "published" && authUser && item.ownerAccountId === authUser.id && (
                      <div style={{ ...subCardStyle, border: "1px solid rgba(212,175,55,.5)", gap: ".35rem" }}>
                        <strong style={{ color: "#FDE68A" }}>✦ O seu anúncio foi selecionado para Destaque Premium</strong>
                        <span style={{ color: "#B5C3D8", fontSize: ".82rem" }}>Este destaque foi oferecido gratuitamente pela equipa durante a campanha.</span>
                      </div>
                    )}
                    {!canClaimFreeSlot && item.listingStatus === "published" && authUser && item.ownerAccountId === authUser.id && (() => {
                      const promotion = featuredPromotions.find((entry) => entry.listing_id === item.id && (entry.status === "pending_payment" || (entry.status === "active" && Boolean(entry.featured_until) && new Date(entry.featured_until as string).getTime() > Date.now())));
                      return <div style={{ ...subCardStyle, border: "1px solid rgba(212,175,55,.45)", gap: ".45rem" }}>
                        <strong style={{ color: "#FDE68A" }}>✦ Atualizar para Destaque Premium · +1.000 CVE / 30 dias</strong>
                        <span style={{ color: "#B5C3D8", fontSize: ".82rem" }}>Mais visibilidade na página inicial, etiqueta exclusiva e moldura dourada. O destaque só começa após confirmação do pagamento.</span>
                        {promotion ? <><span style={{ color: promotion.status === "active" ? "#86EFAC" : "#FCD34D", fontWeight: 750, fontSize: ".82rem" }}>{promotion.status === "active" ? "Destaque ativo até " + new Date(promotion.featured_until || "").toLocaleDateString("pt-PT") : "Pedido registado — " + promotion.amount_cve.toLocaleString("pt-PT") + " CVE · " + (promotion.bank || "BCA") + " · aguarda pagamento e confirmação"}</span>{promotion.status === "pending_payment" && promotion.payment_code && <div style={{ display: "flex", alignItems: "center", gap: ".55rem", flexWrap: "wrap" }}><strong style={{ color: "#FDE68A", letterSpacing: ".08em", fontSize: "1.15rem" }}>{promotion.payment_code}</strong><button type="button" onClick={() => void navigator.clipboard?.writeText(promotion.payment_code || "")} style={secondaryBtnStyle}>Copiar código</button></div>}</> : <><label style={{ color: "#CBD5E1", fontSize: ".8rem" }}>Banco para transferência <select value={featuredBank} onChange={(event) => setFeaturedBank(event.target.value as "BCA" | "BCN")} style={inputStyle}><option value="BCA">BCA</option><option value="BCN">BCN</option></select></label><button type="button" disabled={featuredPromotionBusy === item.id || item.isFeatured} onClick={() => void requestFeaturedPromotion(item)} style={{ ...actionBtnStyle("#9A7416"), color: "#FFF7D6", border: "1px solid rgba(253,230,138,.55)" }}>{featuredPromotionBusy === item.id ? "A registar pedido…" : "Atualizar para Premium · 1.000 CVE"}</button></>}
                      </div>;
                    })()}
                    {item.listingStatus === "suspended" && <button type="button" onClick={() => void republishListing(item)} style={actionBtnStyle("#15803D")}>Voltar a publicar</button>}
                    {item.listingStatus !== "rejected" && (
                      <div>
                        <button
                          type="button"
                          style={secondaryBtnStyle}
                          onClick={() => editingListingId === item.id ? (setEditingListingId(null), setEditDraft(null), setEditFeedback("")) : beginListingEdit(item)}
                        >
                          {editingListingId === item.id ? "Cancelar edição" : "Editar anúncio"}
                        </button>
                      </div>
                    )}

                    {authUser && item.ownerAccountId === authUser.id && (
                      <React.Suspense fallback={<span style={{ color: "#AFC0D6" }}>A carregar fotografias…</span>}><ListingMediaManager listingId={item.id} ownerId={authUser.id} currentCover={item.image} listingStatus={item.listingStatus} onCoverChange={(url) => setListings((prev) => prev.map((current) => current.id === item.id ? { ...current, image: url } : current))} /></React.Suspense>
                    )}

                    {editingListingId === item.id && editDraft && (
                      <form onSubmit={(e) => saveListingEdit(e, item)} style={{ display: "grid", gap: "0.7rem", borderTop: "1px solid rgba(181,195,216,0.16)", paddingTop: "1rem" }}>
                        <strong>Editar dados do anúncio</strong>
                        <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                          Título
                          <input required minLength={1} maxLength={100} value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} style={inputStyle} />
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Categoria
                            <select value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value, subcategory: getCategorySubcategories(e.target.value)[0] || "" })} style={inputStyle}>
                              {Array.from(new Set([...availableCategories, editDraft.category])).map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Subcategoria
                            <select value={editDraft.subcategory} onChange={(e) => setEditDraft({ ...editDraft, subcategory: e.target.value })} style={inputStyle}>
                              {Array.from(new Set([...getCategorySubcategories(editDraft.category), editDraft.subcategory].filter(Boolean))).map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Ilha
                            <select value={editDraft.island} onChange={(e) => setEditDraft({ ...editDraft, island: e.target.value, municipality: LOCATIONS[e.target.value]?.[0] || "" })} style={inputStyle}>
                              {Object.keys(LOCATIONS).map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Concelho / localidade
                            <select value={editDraft.municipality} onChange={(e) => setEditDraft({ ...editDraft, municipality: e.target.value })} style={inputStyle}>
                              {(LOCATIONS[editDraft.island] || []).map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Preço / valor
                            <input maxLength={60} value={editDraft.price} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} style={inputStyle} />
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            WhatsApp
                            <input value={editDraft.whatsapp} onChange={(e) => setEditDraft({ ...editDraft, whatsapp: e.target.value })} style={inputStyle} />
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Telefone
                            <input value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} style={inputStyle} />
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Imagem (URL HTTPS)
                            <input type="url" value={editDraft.image} onChange={(e) => setEditDraft({ ...editDraft, image: e.target.value })} style={inputStyle} />
                          </label>
                        </div>
                        <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                          Descrição
                          <textarea rows={4} maxLength={3000} value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} />
                        </label>
                        {editFeedback && <div style={feedbackBoxStyle}>{editFeedback}</div>}
                        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                          <button type="submit" style={primaryBtnStyle}>Guardar alterações</button>
                          <button type="button" style={secondaryBtnStyle} onClick={() => { setEditingListingId(null); setEditDraft(null); setEditFeedback(""); }}>Cancelar</button>
                        </div>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {tab === "admin" && (
          <section style={panelStyle}>
            <React.Suspense fallback={<div style={{ minHeight: 60 }} />}><FinancePanel canAdmin={canAdmin} /></React.Suspense>
            <React.Suspense fallback={<div style={{ minHeight: 60 }} />}><MonetizationPanel canAdmin={canAdmin} /></React.Suspense>
            <React.Suspense fallback={<div style={{ minHeight: 60 }} />}><ListingPaymentsPanel userId={authUser?.id ?? null} listings={accountListings} canAdmin={canAdmin} onPaymentReviewed={(listingId) => {
              void supabase.from("listings").select("*").eq("id", listingId).maybeSingle().then(({ data, error }) => {
                if (error) { console.error("Falha ao atualizar o anúncio após rever pagamento:", error.message); return; }
                if (data) setListings((prev) => prev.map((item) => item.id === listingId ? mapDatabaseListing(data as Record<string, unknown>) : item));
              });
            }} /></React.Suspense>
            <React.Suspense fallback={<div style={{ minHeight: 40 }} />}><ListingReportsPanel canAdmin={canAdmin} /></React.Suspense>
            <React.Suspense fallback={<div style={{ minHeight: 60 }} />}><ProcuroAdminPanel canAdmin={canAdmin} /></React.Suspense>
            <span style={eyebrowStyle("#EC4899")}>GOVERNANÇA E MODERAÇÃO</span>
            <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>
              Painel Administrativo
            </h1>
            <p style={{ margin: "0 0 1.2rem", color: "#B5C3D8", fontSize: "0.92rem" }}>
              Painel ligado à base de dados partilhada. As ações de moderação são validadas pelo servidor e registadas na auditoria.
            </p>

            <div style={{ display: "grid", gap: "0.9rem", marginBottom: "1.5rem" }}>
              <section style={{ ...subCardStyle, border: "1px solid rgba(212,175,55,.42)" }}>
                <strong style={{ color: "#FDE68A", fontSize: "1.05rem" }}>Pedidos de Destaque Premium</strong>
                <span style={{ color: "#B5C3D8", fontSize: ".82rem" }}>Atualização de anúncio Normal para Premium: 1.000 CVE adicionais por 30 dias. Durante a campanha, a administração pode oferecer Premium gratuitamente a anúncios selecionados. Confirme apenas pagamentos efetivamente recebidos e verificados.</span>
                {featuredPromotions.filter((promotion) => promotion.status === "pending_payment").length === 0 ? <span style={{ color: "#94A3B8", fontSize: ".85rem" }}>Não existem pedidos pendentes de pagamento.</span> : featuredPromotions.filter((promotion) => promotion.status === "pending_payment").map((promotion) => {
                  const promotedListing = listings.find((entry) => entry.id === promotion.listing_id);
                  return <div key={promotion.id} style={{ ...rowCardStyle, display: "grid", gap: ".55rem" }}>
                    <strong>{promotedListing?.title || "Anúncio " + promotion.listing_id}</strong>
                    <span style={{ color: "#B5C3D8", fontSize: ".82rem" }}>Anunciante: {promotedListing?.ownerEmail || promotion.owner_id} · {promotion.amount_cve.toLocaleString("pt-PT")} CVE · {promotion.duration_days} dias · {promotion.bank || "Banco por selecionar"} · Pedido em {new Date(promotion.created_at).toLocaleString("pt-PT")}</span><strong style={{ color: "#FDE68A", letterSpacing: ".08em" }}>Referência CVC: {promotion.payment_code || "Não disponível"}</strong>
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                      <button type="button" disabled={featuredPromotionBusy === promotion.id} onClick={() => void reviewFeaturedPromotion(promotion.id, "confirm")} style={actionBtnStyle("#15803D")}>{featuredPromotionBusy === promotion.id ? "A processar…" : "Confirmar pagamento e ativar"}</button>
                      <button type="button" disabled={featuredPromotionBusy === promotion.id} onClick={() => void reviewFeaturedPromotion(promotion.id, "reject")} style={actionBtnStyle("#991B1B")}>Rejeitar pedido</button>
                    </div>
                  </div>;
                })}
              </section>
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
                  {item.moderationNote && item.listingStatus === "suspended" && <div style={{ color: "#FDE68A", fontSize: ".82rem" }}>Motivo da suspensão: {item.moderationNote}</div>}

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <button
                      type="button"
                      disabled={!featuredSchemaAvailable || item.listingStatus !== "published"}
                      title={!featuredSchemaAvailable ? "Aguarda a migração da base de dados no ambiente de teste." : item.listingStatus !== "published" ? "Só anúncios publicados podem ser destacados." : undefined}
                      onClick={() => void toggleListingFeatured(item)}
                      style={{ ...actionBtnStyle("#B8860B"), opacity: !featuredSchemaAvailable || item.listingStatus !== "published" ? 0.55 : 1, cursor: !featuredSchemaAvailable || item.listingStatus !== "published" ? "not-allowed" : "pointer" }}
                    >
                      {item.isFeatured ? "Retirar destaque premium" : "Destacar anúncio"}
                    </button>
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
                      onClick={() => { const reason = window.prompt("Indique o que o anunciante deve melhorar:"); if (reason?.trim()) void updatePaymentAndListing(item.id, item.paymentStatus, "suspended", reason.trim().slice(0, 1000)); }}
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
                    <button
                      type="button"
                      onClick={() => void deleteListingAsAdmin(item)}
                      style={actionBtnStyle("#991B1B")}
                    >
                      Autorizar eliminação
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

      <footer
        style={{
          marginTop: "2.5rem",
          padding: "2.5rem 1.25rem 1.15rem",
          background: "linear-gradient(180deg, #10182A 0%, #080E1B 100%)",
          borderTop: "1px solid rgba(181,195,216,0.2)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1.2fr) repeat(3,minmax(0,1fr))", gap: "2rem", alignItems: "start" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", minWidth: 0 }}>
            <img
              src="https://raw.githubusercontent.com/Jnivaldo/caboverde-conecta-v2/main/Logo%20caboverdeconecta.png"
              alt="Logótipo CaboVerde Conecta"
              width="92"
              height="92"
              loading="lazy"
              style={{ width: 92, height: 92, objectFit: "contain", flex: "0 0 auto" }}
            />
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", color: "#F8FAFC", fontSize: "1.12rem", letterSpacing: "-.025em", margin: "0.15rem 0 .45rem" }}>CaboVerde Conecta</strong>
              <p style={{ margin: 0, color: "#AFC0D5", fontSize: ".88rem", lineHeight: 1.65 }}>O ponto de encontro entre quem procura e quem oferece em Cabo Verde.</p>
            </div>
          </div>
          <div style={{ display: "grid", alignContent: "start", gap: ".7rem" }}>
            <strong style={{ color: "#F8FAFC", fontSize: ".9rem", letterSpacing: ".04em" }}>CONTACTOS</strong>
            <a href="mailto:jnivaldoliveira@gmail.com" style={{ color: "#D7E6F4", textDecoration: "none", fontSize: ".9rem", lineHeight: 1.5, overflowWrap: "anywhere" }}>✉ jnivaldoliveira@gmail.com</a>
            <a href="https://wa.me/2389823835?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20o%20CaboVerde%20Conecta." target="_blank" rel="noopener noreferrer" style={{ color: "#8EF0C8", textDecoration: "none", fontSize: ".9rem", lineHeight: 1.5 }}>WhatsApp · +238 982 38 35 ↗</a>
            <span style={{ color: "#8192AA", fontSize: ".8rem" }}>Apoio a utilizadores e anunciantes</span>
          </div>
          <div style={{ display: "grid", alignContent: "start", gap: ".7rem" }}>
            <strong style={{ color: "#F8FAFC", fontSize: ".9rem", letterSpacing: ".04em" }}>INFORMAÇÃO</strong>
            <button type="button" onClick={() => setPrivacyOpen(true)} style={{ justifySelf: "start", border: 0, padding: 0, background: "transparent", color: "#D7E6F4", textDecoration: "none", fontSize: ".9rem", cursor: "pointer", textAlign: "left" }}>Política de Privacidade</button>
            <span style={{ color: "#8192AA", fontSize: ".82rem", lineHeight: 1.55 }}>A sua confiança e a proteção dos seus dados são importantes para nós.</span>
          </div>
          <div style={{ display: "grid", alignContent: "start", gap: ".7rem" }}>
            <strong style={{ color: "#F8FAFC", fontSize: ".9rem", letterSpacing: ".04em" }}>DIVULGUE A PLATAFORMA</strong>
            <button type="button" onClick={() => setShareOpen(true)} style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: ".55rem", border: "1px solid rgba(142,240,200,.5)", borderRadius: 10, padding: ".68rem .9rem", background: "linear-gradient(120deg,#0D8060,#145A50)", color: "#FFFFFF", fontSize: ".9rem", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 22px rgba(0,0,0,.2)" }}>↗ Partilhar CaboVerde Conecta</button>
            <span style={{ color: "#8192AA", fontSize: ".82rem", lineHeight: 1.55 }}>Ajude mais pessoas a encontrar produtos, imóveis, viaturas, profissionais e serviços em Cabo Verde.</span>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "2rem auto 0", paddingTop: "1rem", borderTop: "1px solid rgba(181,195,216,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem", flexWrap: "wrap", color: "#8192AA", fontSize: ".76rem" }}>
          <span>© {new Date().getFullYear()} CaboVerde Conecta. Todos os direitos reservados.</span>
          <span>Feito para ligar Cabo Verde.</span>
        </div>
      </footer>

      {shareOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={() => setShareOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 125, display: "grid", placeItems: "center", background: "rgba(3,6,15,.88)", backdropFilter: "blur(8px)", padding: "1rem" }}>
          <section onClick={(event) => event.stopPropagation()} style={{ width: "min(540px,100%)", padding: "clamp(1.1rem,3vw,1.7rem)", background: "#10182A", border: "1px solid rgba(142,240,200,.28)", borderRadius: 18, boxShadow: "0 28px 75px rgba(0,0,0,.5)", color: "#D7E6F4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: ".6rem" }}>
              <div><span style={{ color: "#38D6A0", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".1em" }}>ESPALHE A CONEXÃO</span><h2 id="share-title" style={{ color: "#F8FAFC", margin: ".25rem 0 0", fontSize: "1.45rem" }}>Partilhar CaboVerde Conecta</h2></div>
              <button type="button" onClick={() => setShareOpen(false)} aria-label="Fechar partilha" style={{ ...secondaryBtnStyle, width: "auto", padding: ".5rem .75rem" }}>Fechar ×</button>
            </div>
            <p style={{ color: "#AFC0D5", lineHeight: 1.55, fontSize: ".9rem" }}>Convide amigos, familiares e empresas a conhecer o ponto de encontro entre quem procura e quem oferece em Cabo Verde.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: ".65rem", marginTop: "1rem" }}>
              <a href={`https://wa.me/?text=${encodeURIComponent("Conheça o CaboVerde Conecta — encontre e divulgue produtos, imóveis, viaturas, profissionais e serviços em Cabo Verde: https://www.caboverdeconecta.com")}`} target="_blank" rel="noopener noreferrer" style={{ ...shareLinkStyle }}>WhatsApp ↗</a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.caboverdeconecta.com" target="_blank" rel="noopener noreferrer" style={{ ...shareLinkStyle }}>Facebook ↗</a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent("https://www.caboverdeconecta.com")}&text=${encodeURIComponent("Conheça o CaboVerde Conecta!")}`} target="_blank" rel="noopener noreferrer" style={{ ...shareLinkStyle }}>Telegram ↗</a>
              <a href={`mailto:?subject=${encodeURIComponent("Conheça o CaboVerde Conecta")}&body=${encodeURIComponent("Visite https://www.caboverdeconecta.com — o ponto de encontro entre quem procura e quem oferece em Cabo Verde.")}`} style={{ ...shareLinkStyle }}>E-mail ↗</a>
              <button type="button" onClick={() => { const url = "https://www.caboverdeconecta.com"; if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => window.alert("Endereço copiado. Já pode colar no Instagram, YouTube ou onde desejar.")); else window.prompt("Copie o endereço do site:", url); }} style={{ ...shareLinkStyle, cursor: "pointer" }}>Copiar endereço</button>
              <button type="button" onClick={() => { const url = "https://www.caboverdeconecta.com"; const text = "Conheça o CaboVerde Conecta — encontre e divulgue produtos, imóveis, viaturas, profissionais e serviços em Cabo Verde."; if (navigator.share) navigator.share({ title: "CaboVerde Conecta", text, url }).catch(() => {}); else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text + " " + url).then(() => window.alert("Texto e endereço copiados para partilhar.")); else window.prompt("Copie para partilhar:", text + " " + url); }} style={{ ...shareLinkStyle, cursor: "pointer", background: "linear-gradient(120deg,#0D8060,#145A50)", color: "#FFFFFF" }}>Mais opções no telemóvel ↗</button>
            </div>
            <p style={{ margin: ".9rem 0 0", color: "#8192AA", fontSize: ".78rem", lineHeight: 1.5 }}>Instagram e YouTube: copie o endereço e cole na descrição, biografia, publicação ou mensagem. A disponibilidade das opções depende da aplicação e do dispositivo.</p>
          </section>
        </div>
      )}

      {privacyOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={() => setPrivacyOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(3,6,15,.88)", backdropFilter: "blur(8px)", overflowY: "auto", padding: "1rem" }}>
          <section onClick={(event) => event.stopPropagation()} style={{ width: "min(820px,100%)", margin: "2rem auto", padding: "clamp(1rem,3vw,2rem)", background: "#10182A", border: "1px solid rgba(181,195,216,.22)", borderRadius: 18, boxShadow: "0 28px 75px rgba(0,0,0,.5)", color: "#D7E6F4", lineHeight: 1.7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
              <div><span style={{ color: "#38D6A0", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".1em" }}>CABOVERDE CONECTA</span><h2 id="privacy-title" style={{ color: "#F8FAFC", margin: ".2rem 0 0", fontSize: "1.55rem" }}>Política de Privacidade</h2></div>
              <button type="button" onClick={() => setPrivacyOpen(false)} aria-label="Fechar política de privacidade" style={{ ...secondaryBtnStyle, width: "auto", padding: ".55rem .8rem" }}>Fechar ×</button>
            </div>
            <p style={{ color: "#AFC0D5", fontSize: ".82rem" }}>Última atualização: 28 de novembro de 2026</p>
            <p>Esta política explica, de forma clara, como o CaboVerde Conecta recolhe, utiliza, conserva e protege informações quando visita a plataforma, cria uma conta, publica um anúncio ou entra em contacto connosco.</p>
            <h3 style={{ color: "#F8FAFC" }}>1. Que informações podemos recolher</h3>
            <p>Podemos tratar dados de conta e autenticação (como nome, endereço de email e dados necessários para iniciar sessão, incluindo através do Google); dados fornecidos nos anúncios (título, descrição, localização, fotografias, preço e contactos que o anunciante decida divulgar); mensagens enviadas ao suporte; denúncias de anúncios; e informação técnica básica necessária para segurança, funcionamento e diagnóstico da plataforma.</p>
            <h3 style={{ color: "#F8FAFC" }}>2. Para que utilizamos os dados</h3>
            <p>Utilizamos os dados para criar e gerir contas, apresentar e administrar anúncios, permitir o contacto direto entre interessados e anunciantes, prestar apoio, gerir denúncias e prevenir fraude ou abuso, verificar pagamentos relacionados com anúncios e manter a segurança e o funcionamento do serviço.</p>
            <h3 style={{ color: "#F8FAFC" }}>3. Anúncios e partilha de informação</h3>
            <p>Os dados incluídos num anúncio publicado — incluindo fotografias, localização e contactos escolhidos pelo anunciante — podem ficar visíveis publicamente. O CaboVerde Conecta não deve ser utilizado para publicar dados pessoais de terceiros sem autorização. Quando contacta um anunciante, a comunicação pode continuar diretamente por telefone ou WhatsApp, sujeito também às políticas desses serviços.</p>
            <h3 style={{ color: "#F8FAFC" }}>4. Prestadores de serviços</h3>
            <p>A plataforma utiliza prestadores tecnológicos para alojamento, base de dados, autenticação e operação do site, incluindo serviços da Supabase e da Vercel. Se escolher iniciar sessão com Google, a autenticação também envolve a Google. Estes prestadores tratam informação na medida necessária à prestação dos respetivos serviços, de acordo com os seus próprios termos e políticas.</p>
            <h3 style={{ color: "#F8FAFC" }}>5. Conservação e segurança</h3>
            <p>Conservamos os dados pelo período necessário para prestar o serviço, cumprir obrigações aplicáveis, resolver disputas e proteger a plataforma. Aplicamos medidas técnicas e organizativas razoáveis para proteger a informação, mas nenhum serviço online pode garantir segurança absoluta.</p>
            <h3 style={{ color: "#F8FAFC" }}>6. Os seus direitos e escolhas</h3>
            <p>Pode solicitar acesso, correção ou eliminação dos seus dados pessoais, bem como colocar questões sobre a sua utilização, através dos contactos indicados abaixo. Alguns dados poderão ter de ser conservados quando exista uma obrigação legal ou necessidade legítima de segurança, prevenção de fraude ou resolução de litígios. Pode também optar por não divulgar dados pessoais nos campos públicos dos anúncios.</p>
            <h3 style={{ color: "#F8FAFC" }}>7. Cookies e tecnologias semelhantes</h3>
            <p>A plataforma e os seus prestadores podem utilizar armazenamento local, cookies ou tecnologias semelhantes estritamente necessários à autenticação, segurança, preferências e funcionamento do serviço. As definições do navegador permitem gerir ou bloquear cookies, embora algumas funcionalidades possam deixar de funcionar corretamente.</p>
            <h3 style={{ color: "#F8FAFC" }}>8. Alterações a esta política</h3>
            <p>Podemos atualizar esta política para refletir alterações no serviço ou nas obrigações aplicáveis. A versão em vigor será disponibilizada nesta página, com a respetiva data de atualização.</p>
            <h3 style={{ color: "#F8FAFC" }}>9. Contactos</h3>
            <p>Para questões ou pedidos relacionados com privacidade e dados pessoais, contacte-nos por <a href="mailto:jnivaldoliveira@gmail.com" style={{ color: "#8EF0C8" }}>jnivaldoliveira@gmail.com</a> ou pelo WhatsApp <a href="https://wa.me/2389823835" target="_blank" rel="noopener noreferrer" style={{ color: "#8EF0C8" }}>+238 982 38 35</a>.</p>
            <p style={{ color: "#8192AA", fontSize: ".8rem", borderTop: "1px solid rgba(181,195,216,.12)", paddingTop: ".8rem" }}>Esta política é uma informação geral sobre o funcionamento da plataforma e deve ser revista para refletir a entidade jurídica responsável e os requisitos legais aplicáveis em Cabo Verde antes de ser considerada aconselhamento jurídico.</p>
          </section>
        </div>
      )}

      {/* Assistente temporariamente oculto; a implementação será preservada para uma revisão posterior. */}
      {selectedListing && (
        <div role="dialog" aria-modal="true" aria-label={"Detalhes: " + selectedListing.title} onClick={() => setSelectedListing(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(3,6,15,.88)", backdropFilter: "blur(8px)", overflowY: "auto", padding: "1rem" }}>
          <section onClick={(e) => e.stopPropagation()} style={{ width: "min(920px,100%)", margin: "2rem auto", background: "#10182A", border: "1px solid rgba(181,195,216,.22)", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
            <div style={{ padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(181,195,216,.14)" }}><span style={{ color: "#93C5FD", fontWeight: 750, fontSize: ".8rem" }}>DETALHES DO ANÚNCIO</span><button type="button" onClick={() => setSelectedListing(null)} style={secondaryBtnStyle}>Fechar ×</button></div>
            <div style={{ padding: "1.1rem", display: "grid", gap: "1rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><span style={{ ...badgeStyle("#1D4ED8"), fontSize: ".8rem" }}>{selectedListing.category}</span>{selectedListing.subcategory && <span style={{ ...badgeStyle("#334155"), fontSize: ".8rem" }}>{selectedListing.subcategory}</span>}{clockNow - new Date(selectedListing.createdAt).getTime() < 86_400_000 && clockNow >= new Date(selectedListing.createdAt).getTime() && <span style={{ ...badgeStyle("#FACC15"), color: "#172033", fontSize: ".8rem" }}>Novo anúncio</span>}</div>
              <h2 style={{ margin: 0, fontSize: "clamp(1.35rem,3vw,2rem)", lineHeight: 1.35, color: "#F8FAFC" }}>{selectedListing.title}</h2>
              <div style={{ color: "#B5C3D8" }}>📍 {selectedListing.municipality}{selectedListing.island ? ", " + selectedListing.island : ""}</div>
              <div style={{ padding: "1rem", borderRadius: 14, background: "linear-gradient(135deg,rgba(56,214,160,.13),rgba(96,165,250,.1))", border: "1px solid rgba(56,214,160,.25)" }}><strong style={{ color: "#5EEAD4", fontSize: "1.5rem" }}>{selectedListing.price || "Preço sob consulta"}</strong></div>
              <ListingGallery title={selectedListing.title} images={(mediaByListing[selectedListing.id] || []).filter(m => m.type === "image").sort((a,b)=>a.sort-b.sort)} fallbackImage={selectedListing.image} onOpen={(src,images,index)=>setLightbox({src,title:selectedListing.title,images,index})}/>
              <h3 style={{ margin: "0.25rem 0 0", color: "#E2E8F0" }}>Descrição</h3><p style={{ whiteSpace: "pre-wrap", color: "#D7E6F4", lineHeight: 1.7, margin: 0 }}>{selectedListing.description}</p>
              {(mediaByListing[selectedListing.id] || []).filter(m=>m.type==="video").map(m=><video key={m.id} src={m.url} controls style={{ width: "100%", maxHeight: 400, borderRadius: 12, background: "#070B18" }}/>)}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: ".3rem" }}>
                {selectedListing.whatsapp && <a href={`https://api.whatsapp.com/send?phone=${selectedListing.whatsapp.replace(/\\D/g,"")}&text=${encodeURIComponent("Olá! Tenho interesse no anúncio "+selectedListing.title+" publicado no CaboVerde Conecta. Gostaria de obter mais informações. Obrigado(a)!")}`} target="_blank" rel="noopener noreferrer" style={{ ...whatsappBtnStyle, padding: ".85rem", minWidth: 220 }}>Contactar via WhatsApp</a>}
                {selectedListing.phone && <a href={`tel:${selectedListing.phone.replace(/\\D/g,"")}`} style={{ ...callLinkStyle, padding: ".85rem" }}>Ligar ao anunciante</a>}
              </div>
              <p style={{ margin: 0, color: "#94A3B8", fontSize: ".82rem" }}>Contacte diretamente o anunciante e confirme os detalhes antes de qualquer negócio.</p>
              {selectedListing.ownerAccountId !== authUser?.id && <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid rgba(148,163,184,.14)", paddingTop: ".65rem" }}>
                {reportFeedback && <span role="status" style={{ color: reportFeedback.startsWith("Denúncia enviada") ? "#86EFAC" : "#FCA5A5", fontSize: ".78rem" }}>{reportFeedback}</span>}
                <button type="button" onClick={() => { if (!authUser) { setFeedback("Entre na sua conta para denunciar um anúncio."); setSelectedListing(null); setTab("account"); return; } setReportFeedback(""); setReportOpen((value) => !value); }} style={{ border: 0, padding: ".25rem .35rem", background: "transparent", color: "#94A3B8", textDecoration: "underline", fontSize: ".78rem", cursor: "pointer" }}>Denunciar anúncio</button>
              </div>}
              {reportOpen && <form onSubmit={async (event) => { event.preventDefault(); if (!authUser || reportBusy) return; setReportBusy(true); setReportFeedback(""); const { error } = await supabase.rpc("submit_listing_report", { p_listing_id: selectedListing.id, p_reason: reportReason, p_details: reportDetails.trim() || null }); setReportBusy(false); if (error) setReportFeedback(error.message.includes("Já enviou") ? "Já enviou uma denúncia para este anúncio." : error.message.includes("Limite de 5 denúncias") ? "Limite de 5 denúncias em 24 horas atingido. Tente novamente mais tarde." : "Não foi possível enviar. Tente novamente."); else { setReportFeedback("Denúncia enviada. Obrigado por ajudar a comunidade."); setReportOpen(false); setReportDetails(""); } }} style={{ display: "grid", gap: ".55rem", padding: ".75rem", borderRadius: 10, border: "1px solid rgba(148,163,184,.2)", background: "rgba(7,11,24,.48)" }}>
                <strong style={{ color: "#E2E8F0", fontSize: ".82rem" }}>Qual é o problema?</strong>
                <select required value={reportReason} onChange={(event) => setReportReason(event.target.value)} style={{ ...inputStyle, padding: ".55rem .65rem", fontSize: ".82rem" }}><option value="fraude">Suspeita de fraude</option><option value="informacao_falsa">Informação falsa</option><option value="conteudo_inadequado">Conteúdo inadequado</option><option value="anuncio_duplicado">Anúncio duplicado</option><option value="outro">Outro motivo</option></select>
                <textarea rows={2} maxLength={1000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Detalhes adicionais (opcional)" style={{ ...inputStyle, resize: "vertical", fontSize: ".82rem" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}><button type="button" onClick={() => setReportOpen(false)} style={{ ...secondaryBtnStyle, padding: ".45rem .7rem", fontSize: ".78rem" }}>Cancelar</button><button type="submit" disabled={reportBusy} style={{ ...primaryBtnStyle, padding: ".45rem .7rem", fontSize: ".78rem" }}>{reportBusy ? "A enviar…" : "Enviar denúncia"}</button></div>
              </form>}
            </div>
          </section>
        </div>
      )}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(3,6,15,0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 100,
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", width: "min(1100px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}
          >
            <button type="button" aria-label="Fechar galeria" onClick={() => setLightbox(null)} style={{ position: "fixed", top: "max(12px, env(safe-area-inset-top))", right: "max(12px, env(safe-area-inset-right))", minWidth: 88, height: 44, padding: "0 13px", borderRadius: 999, border: "1px solid rgba(255,255,255,.42)", background: "rgba(21,31,51,.96)", color: "#fff", fontSize: 15, fontWeight: 750, cursor: "pointer", zIndex: 110, boxShadow: "0 4px 18px rgba(0,0,0,.35)" }}>Fechar ×</button>
            <div
              onTouchStart={(event) => {
                const touch = event.touches[0];
                if (touch) lightboxTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(event) => {
                const start = lightboxTouchStartRef.current;
                lightboxTouchStartRef.current = null;
                const touch = event.changedTouches[0];
                if (!start || !touch || lightbox.images.length < 2) return;
                const deltaX = touch.clientX - start.x;
                const deltaY = touch.clientY - start.y;
                if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
                const direction = deltaX < 0 ? 1 : -1;
                setLightbox((current) => {
                  if (!current || current.images.length < 2) return current;
                  const index = (current.index + direction + current.images.length) % current.images.length;
                  return { ...current, index, src: current.images[index].url };
                });
              }}
              style={{ position: "relative", width: "100%", minHeight: "min(68vh, 680px)", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "pan-y" }}
            >
              <img
                key={lightbox.src}
                src={lightbox.src}
                alt={lightbox.title + " — fotografia " + (lightbox.index + 1)}
                style={{ maxWidth: "100%", width: "auto", maxHeight: "min(76vh, 760px)", objectFit: "contain", borderRadius: 10, boxShadow: "0 24px 80px rgba(0,0,0,.55)", animation: "conecta-gallery-fade .28s ease both" }}
              />
              {lightbox.images.length > 1 && (
                <>
                  <button type="button" aria-label="Fotografia anterior" onClick={() => setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length, src: current.images[(current.index - 1 + current.images.length) % current.images.length].url } : null)} style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, minHeight: 28, padding: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,.28)", background: "rgba(7,11,24,.42)", color: "#fff", fontSize: 19, lineHeight: 1, cursor: "pointer" }}>‹</button>
                  <button type="button" aria-label="Fotografia seguinte" onClick={() => setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.images.length, src: current.images[(current.index + 1) % current.images.length].url } : null)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, minHeight: 28, padding: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,.28)", background: "rgba(7,11,24,.42)", color: "#fff", fontSize: 19, lineHeight: 1, cursor: "pointer" }}>›</button>
                </>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap", color: "#F8FAFC", textAlign: "center" }}>
              <strong style={{ fontSize: "0.96rem" }}>{lightbox.title}</strong>
              {lightbox.images.length > 1 && <span style={{ padding: "0.35rem 0.7rem", borderRadius: 999, background: "rgba(255,255,255,.12)", color: "#D7E6F4", fontSize: "0.82rem", fontWeight: 700 }}>{lightbox.index + 1} de {lightbox.images.length}</span>}
            </div>
            {lightbox.images.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 7, maxWidth: "100%", overflowX: "auto", padding: "0.25rem 0.1rem 0.45rem" }}>
                {lightbox.images.map((photo, index) => (
                  <button key={photo.id} type="button" aria-label={"Abrir fotografia " + (index + 1)} onClick={() => setLightbox((current) => current ? { ...current, index, src: photo.url } : null)} style={{ flex: "0 0 auto", width: 62, height: 48, padding: 0, overflow: "hidden", borderRadius: 7, border: index === lightbox.index ? "2px solid #60A5FA" : "1px solid rgba(255,255,255,.22)", opacity: index === lightbox.index ? 1 : .62, background: "transparent", cursor: "pointer" }}>
                    <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
            <span style={{ color: "#9FB0C8", fontSize: "0.76rem" }}>{lightbox.images.length > 1 ? "Deslize para a esquerda ou direita, ou use os controlos, para percorrer as fotografias" : "Toque em Fechar para regressar ao anúncio"} · Esc para fechar</span>
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