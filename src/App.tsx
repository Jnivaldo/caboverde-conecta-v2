import React, { useEffect, useMemo, useRef, useState } from "react";
import "./responsive.css";import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import AuthPanel from "./components/AuthPanel";
import ListingMediaPicker from "./components/ListingMediaPicker";
import ListingMediaManager from "./components/ListingMediaManager";
import ProcuroOfereco from "./components/ProcuroOfereco";
import ProcuroHomeHighlights from "./components/ProcuroHomeHighlights";

import {
  type Listing,
  type ListingStatus,
  type PaymentStatus,
  type PaymentMethod,
} from "./data/listingRepository";
import { countListingsByStatus, getPreviewListingsByEmail } from "./data/listingManagement";
import { applyListingEdit, validateListingEdit, type EditableListingFields } from "./data/listingEditPolicy";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

interface CategorySuggestion {
  id: string;
  requester_id: string;
  requested_category: string;
  requested_subcategory: string;
  description: string;
  created_at: string;
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
    paymentStatus: (row.payment_status ?? "pending") as PaymentStatus,
    paymentMethod: "free_launch",
    proofRef: row.proof_ref ? String(row.proof_ref) : undefined,
    slotNumber: typeof row.slot_number === "number" ? row.slot_number : undefined,
    createdAt: String(row.created_at ?? "").slice(0, 10),
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
          <button type="button" aria-label="Fotografia anterior" onClick={() => move(-1)} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,.55)", background: "rgba(7,11,24,.72)", color: "#fff", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>‹</button>
          <button type="button" aria-label="Fotografia seguinte" onClick={() => move(1)} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,.55)", background: "rgba(7,11,24,.72)", color: "#fff", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>›</button>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 9, display: "flex", justifyContent: "center", alignItems: "center", gap: 5 }}>
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" aria-label={"Ver fotografia " + (index + 1)} onClick={() => setActiveIndex(index)} style={{ width: index === activeIndex ? 18 : 7, height: 7, padding: 0, border: 0, borderRadius: 99, background: index === activeIndex ? "#fff" : "rgba(255,255,255,.58)", cursor: "pointer", transition: "all .2s ease" }} />
            ))}
          </div>
          <span style={{ position: "absolute", top: 9, right: 9, padding: "4px 8px", borderRadius: 99, background: "rgba(7,11,24,.72)", color: "#fff", fontSize: 11, fontWeight: 650 }}>{activeIndex + 1}/{slides.length}</span>
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
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFeedback, setSignOutFeedback] = useState("");
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

  async function handleHeaderSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFeedback("");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setSigningOut(false);
    if (error) {
      setSignOutFeedback("Não foi possível terminar a sessão. Tente novamente.");
      console.error("Falha ao terminar sessão:", error.message);
      return;
    }
    setCanAdmin(false);
    setAccountEmail("");
    setTab("home");
    setSignOutFeedback("Sessão terminada com sucesso.");
  }

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
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[]>([]);
  const [categorySuggestionsLoading, setCategorySuggestionsLoading] = useState(false);
  const [categoryReviewFeedback, setCategoryReviewFeedback] = useState("");
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionSubcategory, setSuggestionSubcategory] = useState("");
  const [suggestionDescription, setSuggestionDescription] = useState("");
  const [suggestionFeedback, setSuggestionFeedback] = useState("");
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);

  const accountListings = useMemo(
    () => authUser ? getPreviewListingsByEmail(listings, authUser.email ?? "") : [],
    [listings, authUser]
  );
  const accountListingCounts = useMemo(
    () => countListingsByStatus(accountListings),
    [accountListings]
  );

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

  useEffect(() => {
    if (!canAdmin) {
      setCategorySuggestions([]);
      return;
    }
    let active = true;
    setCategorySuggestionsLoading(true);
    async function loadPendingCategorySuggestions() {
      const { data, error } = await supabase
        .from("category_suggestions")
        .select("id, requester_id, requested_category, requested_subcategory, description, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setCategoryReviewFeedback("Não foi possível carregar as sugestões: " + error.message);
      } else {
        setCategorySuggestions((data ?? []) as CategorySuggestion[]);
      }
      setCategorySuggestionsLoading(false);
    }
    loadPendingCategorySuggestions();
    return () => { active = false; };
  }, [canAdmin]);

  // Filtros públicos (apenas anúncios publicados)
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [island, setIsland] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [lightbox, setLightbox] = useState<{ src: string; title: string; images: { id: string; url: string }[]; index: number } | null>(null);

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
  const [proofRef, setProofRef] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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
  const [usedFreeSlots, setUsedFreeSlots] = useState(0);
  const freeSlotsRemaining = Math.max(0, totalFreeSlots - usedFreeSlots);
  const canClaimFreeSlot = freeSlotsRemaining > 0;

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

  async function submitCategorySuggestion() {
    setSuggestionFeedback("");
    if (!authUser) {
      setSuggestionFeedback("Entre na sua conta para enviar uma sugestão.");
      setTab("account");
      return;
    }
    const requestedCategory = (suggestionCategory.trim() || (useCustomCategory ? customCategory.trim() : pubCategory)).trim();
    const requestedSubcategory = (suggestionSubcategory.trim() || ((useCustomCategory || useCustomSubcategory) ? customSubcategory.trim() : "")).trim();
    if (requestedCategory.length < 2) {
      setSuggestionFeedback("Indique uma categoria com pelo menos 2 caracteres.");
      return;
    }
    if (!requestedSubcategory && !suggestionDescription.trim()) {
      setSuggestionFeedback("Indique um produto, subproduto ou serviço, ou explique a nova categoria.");
      return;
    }
    setSuggestionSubmitting(true);
    const { error } = await supabase.from("category_suggestions").insert({
      requester_id: authUser.id,
      requested_category: requestedCategory,
      requested_subcategory: requestedSubcategory,
      description: suggestionDescription.trim(),
      status: "pending",
    });
    if (error) {
      setSuggestionFeedback("Não foi possível enviar a sugestão: " + error.message);
    } else {
      setSuggestionFeedback("Sugestão enviada! A administração irá analisá-la. Se for aprovada, ficará disponível na lista para todos.");
      setSuggestionCategory("");
      setSuggestionSubcategory("");
      setSuggestionDescription("");
    }
    setSuggestionSubmitting(false);
  }

  async function reviewCategorySuggestion(id: string, decision: "approved" | "rejected") {
    setCategoryReviewFeedback("");
    const { error } = await supabase.rpc("review_category_suggestion", {
      p_suggestion_id: id,
      p_decision: decision,
      p_admin_notes: null,
    });
    if (error) {
      setCategoryReviewFeedback("Não foi possível atualizar a sugestão: " + error.message);
      return;
    }
    setCategorySuggestions((current) => current.filter((item) => item.id !== id));
    if (decision === "approved") {
      const { data, error: categoriesError } = await supabase
        .from("marketplace_categories")
        .select("category_name, subcategory_name")
        .eq("is_active", true);
      if (!categoriesError && data) {
        setMarketplaceCategoryOptions(data as { category_name: string; subcategory_name: string | null }[]);
      }
      setCategoryReviewFeedback("Sugestão aprovada e adicionada às opções de publicação.");
    } else {
      setCategoryReviewFeedback("Sugestão rejeitada.");
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

    if (title.trim().length < 5 || title.trim().length > 100) {
      setFeedback("O título deve ter entre 5 e 100 caracteres.");
      return;
    }
    if (!price.trim() || price.trim().length > 60) {
      setFeedback("Indique um preço ou valor válido (máximo de 60 caracteres).");
      return;
    }
    if (useCustomCategory && customCategory.trim().length < 3) {
      setFeedback("Indique uma categoria com pelo menos 3 caracteres.");
      return;
    }
    if ((useCustomCategory || useCustomSubcategory) && customSubcategory.trim().length < 2) {
      setFeedback("Indique o produto, subproduto ou serviço que pretende anunciar.");
      return;
    }
    if (!pubIsland || !LOCATIONS[pubIsland]?.includes(pubMunicipality)) {
      setFeedback("Selecione uma ilha e um concelho válidos.");
      return;
    }
    if (!ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      setFeedback("Indique um endereço de email válido.");
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
        setFeedback("A imagem deve utilizar um endereço HTTPS válido.");
        return;
      }
    }

    if (paymentMethod !== "free_launch") {
      setFeedback("Os pagamentos por transferência ainda não estão ativos nesta versão. Não faça transferências nem envie comprovativos. Aguarde a ativação do pagamento seguro.");
      return;
    }

    if (!canClaimFreeSlot) {
      setFeedback("As 50 vagas gratuitas já foram preenchidas. O pagamento seguro ainda não está ativo; por isso, não é possível submeter novos anúncios.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.rpc("submit_listing", {
      p_title: title.trim(),
      p_category: useCustomCategory ? customCategory.trim() : pubCategory,
      p_subcategory: useCustomCategory || useCustomSubcategory ? customSubcategory.trim() : pubSubcategory,
      p_island: pubIsland,
      p_municipality: pubMunicipality,
      p_price: price.trim(),
      p_description: description.trim(),
      p_whatsapp: cleanWhatsApp,
      p_phone: cleanPhone,
      p_image_url: imageUrl.trim(),
    });

    if (error) {
      const message = error.message.includes("CAMPAIGN_FULL_PAYMENT_NOT_AVAILABLE")
        ? "As 50 vagas gratuitas já foram preenchidas. O pagamento seguro ainda não está ativo."
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
    setListings((prev) => [newAd, ...prev]);
    setUsedFreeSlots((current) => Math.max(current, newAd.slotNumber ?? current));
    addAudit(`Anúncio ${newAd.id} enviado ao servidor e recebeu a vaga gratuita #${newAd.slotNumber}.`);
    setTitle("");
    setPrice("");
    setDescription("");
    setProofRef("");
    setCustomCategory("");
    setCustomSubcategory("");
    setUseCustomCategory(false);
    setUseCustomSubcategory(false);
    setMediaFiles([]);
    setFeedback("Anúncio submetido com sucesso! O seu anúncio está pendente de aprovação pelo administrador.");
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
    nextListing: ListingStatus
  ) {
    if (!authUser || !canAdmin) return;
    const { error } = await supabase.from("listings").update({
      payment_status: nextPayment,
      listing_status: nextListing,
    }).eq("id", id);
    if (error) {
      setFeedback("Ação administrativa não concluída: " + error.message);
      return;
    }
    setListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, paymentStatus: nextPayment, listingStatus: nextListing }
          : item
      )
    );
    const action = `payment=${nextPayment}; listing=${nextListing}`;
    await supabase.from("audit_logs").insert({
      actor_id: authUser.id,
      listing_id: id,
      action: "listing_moderation",
      details: { payment_status: nextPayment, listing_status: nextListing },
    });
    addAudit(`Ação administrativa gravada no servidor em ${id}: ${action}.`);
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
              Campanha de lançamento: até 50 anúncios gratuitos · Após campanha: 1.500 CVE
            </div>
          </div>

          <nav style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            {[
              { key: "home", label: "Início" },
              { key: "publish", label: "Publicar Anúncio" },
              { key: "requests", label: "Procuro & Ofereço" },
              { key: "account", label: "Minha Conta" },
              ...(canAdmin ? [{ key: "admin", label: "Administração" }] : []),
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
            {authUser && (
              <button
                type="button"
                onClick={handleHeaderSignOut}
                disabled={signingOut}
                aria-label="Terminar sessão"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 132,
                  minHeight: 42,
                  padding: "0.55rem 0.9rem",
                  borderRadius: 10,
                  border: "1px solid #FCA5A5",
                  background: "#991B1B",
                  color: "#FFFFFF",
                  cursor: signingOut ? "wait" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {signingOut ? "A sair..." : "Terminar sessão"}
              </button>
            )}
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

          </div>
        </div>
        {signOutFeedback && (
          <div role="status" aria-live="polite" style={{ maxWidth: 1200, margin: "0.55rem auto 0", color: signOutFeedback.startsWith("Não foi") ? "#FCA5A5" : "#6EE7B7", fontSize: "0.8rem" }}>
            {signOutFeedback}
          </div>
        )}
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

            <ProcuroHomeHighlights onOpen={() => setTab("requests")} />

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
                {Array.from(new Set([...availableCategories, ...listings.map((item) => item.category).filter(Boolean)])).map((c) => (
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
                {(category ? Array.from(new Set([...getCategorySubcategories(category), ...listings.filter((item) => item.category === category).map((item) => item.subcategory).filter(Boolean)])) : []).map((sub) => (
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

            {publicListings.length === 0 ? (
              <div style={{ ...panelStyle, textAlign: "center", color: "#B5C3D8" }}>
                <strong style={{ color: "#F8FAFC" }}>Ainda não existem anúncios publicados.</strong>
                <p style={{ margin: "0.45rem 0 0", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  Os anúncios só aparecerão aqui depois de submetidos, analisados e publicados pela plataforma.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(275px, 1fr))",
                  gap: "1.2rem",
                }}
              >
              {publicListings.map((ad) => (
                <article key={ad.id} style={cardStyle}>
                  <ListingGallery
                    title={ad.title}
                    images={(mediaByListing[ad.id] || []).filter((media) => media.type === "image").sort((a, b) => a.sort - b.sort)}
                    fallbackImage={ad.image}
                    onOpen={(src, images, index) => setLightbox({ src, title: ad.title, images, index })}
                  />
                  <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
                    <span style={{ fontSize: "0.79rem", color: "#B5C3D8" }}>
                      {ad.category} · {ad.subcategory} · {ad.island} ({ad.municipality})
                    </span>
                    <h2 style={{ margin: 0, fontSize: "1.03rem", lineHeight: 1.35 }}>{ad.title}</h2>
                    <strong style={{ color: "#38D6A0", fontSize: "0.98rem" }}>{ad.price}</strong>
                    <ListingDescription description={ad.description} />
                    {(mediaByListing[ad.id] || []).some((media) => media.type === "video") && (
                      <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                        {(mediaByListing[ad.id] || []).filter((media) => media.type === "video").map((media) => (
                          <video key={media.id} src={media.url} controls style={{ width: 110, height: 76, objectFit: "cover", borderRadius: 7 }} />
                        ))}
                      </div>
                    )}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
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
            )}
          </>
        )}

        {tab === "requests" && (
          <ProcuroOfereco
            user={authUser}
            canAdmin={canAdmin}
            onAuthClick={() => setTab("account")}
          />
        )}

        {tab === "publish" && (
          <section style={panelStyle}>
            <div style={{ marginBottom: "1.1rem" }}>
              <span style={eyebrowStyle("#8B5CF6")}>SUBMISSÃO DE ANÚNCIO</span>
              <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>Publicar Anúncio</h1>
              <p style={{ margin: 0, color: "#B5C3D8", fontSize: "0.92rem", lineHeight: 1.5 }}>
                Campanha de lançamento: até 50 anúncios gratuitos, sujeitos a confirmação do servidor. Valor padrão após campanha:{" "}
                <strong style={{ color: "#F8FAFC" }}>1.500 CVE</strong>. O envio de comprovativo nunca publica o anúncio
                automaticamente — depende sempre da confirmação do administrador.
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
                  <p style={{ margin: "0 auto 0.9rem", maxWidth: 520, color: "#D7E6F4", lineHeight: 1.55, fontSize: "0.92rem" }}>Recebemos os seus dados e fotografias. O anúncio está <strong style={{ color: "#FBBF24" }}>PENDENTE DE APROVAÇÃO</strong> e só ficará visível ao público depois da validação do administrador.</p>
                  <button type="button" onClick={() => setSubmissionSuccess(false)} style={{ ...secondaryBtnStyle, borderColor: "rgba(56,214,160,0.55)" }}>Continuar</button>
                </div>
              </div>
            )}

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

                <div style={{ marginTop: "0.75rem", padding: "0.9rem", border: "1px dashed rgba(96,165,250,0.55)", borderRadius: 12, background: "rgba(37,99,235,0.07)", display: "grid", gap: "0.6rem" }}>
                  <strong style={{ color: "#F8FAFC", fontSize: "0.9rem" }}>Não encontrou uma categoria, produto ou serviço?</strong>
                  <p style={{ margin: 0, color: "#B5C3D8", fontSize: "0.82rem", lineHeight: 1.45 }}>Envie uma sugestão à administração. Depois de aprovada, a nova opção ficará disponível para todos os anunciantes.</p>
                  <input
                    type="text"
                    maxLength={60}
                    value={suggestionCategory}
                    onChange={(e) => setSuggestionCategory(e.target.value)}
                    placeholder={`Categoria (por defeito: ${useCustomCategory ? customCategory || "nova categoria" : pubCategory})`}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    maxLength={80}
                    value={suggestionSubcategory}
                    onChange={(e) => setSuggestionSubcategory(e.target.value)}
                    placeholder="Novo produto, subproduto ou serviço (opcional para categoria nova)"
                    style={inputStyle}
                  />
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={suggestionDescription}
                    onChange={(e) => setSuggestionDescription(e.target.value)}
                    placeholder="Explique brevemente a sugestão (opcional)"
                    style={inputStyle}
                  />
                  {suggestionFeedback && <div role="status" aria-live="polite" style={{ color: suggestionFeedback.startsWith("Sugestão enviada") ? "#6EE7B7" : "#FBBF24", fontSize: "0.82rem" }}>{suggestionFeedback}</div>}
                  <button type="button" onClick={submitCategorySuggestion} disabled={suggestionSubmitting} style={{ ...secondaryBtnStyle, borderColor: "rgba(96,165,250,0.55)", color: "#BFDBFE", opacity: suggestionSubmitting ? 0.65 : 1 }}>
                    {suggestionSubmitting ? "A enviar sugestão…" : "Enviar sugestão para aprovação"}
                  </button>
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
                <strong style={{ fontSize: "0.92rem", color: "#F8FAFC" }}>2. Fotografias e vídeos</strong>
                <ListingMediaPicker files={mediaFiles} onChange={setMediaFiles} />
              </div>

              <div style={subCardStyle}>
                <strong style={{ fontSize: "0.92rem", color: "#F8FAFC" }}>3. Modalidade e Pagamento (1.500 CVE)</strong>
                <div style={{ fontSize: "0.85rem", color: "#B5C3D8", lineHeight: 1.55 }}>
                  Esta pré-visualização ainda não processa pagamentos. Não faça transferências bancárias nem envie comprovativos. Os dados de pagamento só serão apresentados quando o fluxo seguro estiver ativo.
                </div>

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  style={inputStyle}
                  disabled={!canClaimFreeSlot}
                >
                  {canClaimFreeSlot ? (
                    <option value="free_launch">
                      Solicitar vaga gratuita na campanha (sujeita a confirmação)
                    </option>
                  ) : (
                    <option value="free_launch">Campanha gratuita esgotada — pagamentos ainda indisponíveis</option>
                  )}
                </select>
              </div>

              <button type="submit" disabled={isSubmitting} style={{ ...primaryBtnStyle, opacity: isSubmitting ? 0.72 : 1, cursor: isSubmitting ? "wait" : "pointer", minHeight: 48 }}>
                {isSubmitting ? "A enviar anúncio… Não feche esta página" : "Submeter Anúncio para Análise"}
              </button>
            </form>
          </section>
        )}

        {tab === "account" && (
          <section style={panelStyle}>
            <span style={eyebrowStyle("#38D6A0")}>ÁREA DO ANUNCIANTE</span>
            <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>Minha Conta</h1>
            <p style={{ margin: "0 0 1.2rem", color: "#B5C3D8", fontSize: "0.92rem" }}>
              Entre na sua conta para consultar os anúncios associados ao seu perfil em qualquer dispositivo.
            </p>

            <div style={{ ...subCardStyle, maxWidth: 520, marginBottom: "1rem" }}>
              {authLoading ? (
                <span style={{ color: "#B5C3D8", fontSize: "0.88rem" }}>A verificar sessão segura...</span>
              ) : (
                <AuthPanel user={authUser} onSignedIn={(user) => { setAuthUser(user); setAccountEmail(user.email ?? ""); }} onSignedOut={() => { setAuthUser(null); setAccountEmail(""); setListings([]); }} />
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

            <div style={{ display: "grid", gap: "0.85rem" }}>
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
                      <ListingMediaManager
                        listingId={item.id}
                        ownerId={authUser.id}
                        currentCover={item.image}
                        onCoverChange={(url) => setListings((prev) => prev.map((current) => current.id === item.id ? { ...current, image: url } : current))}
                      />
                    )}

                    {editingListingId === item.id && editDraft && (
                      <form onSubmit={(e) => saveListingEdit(e, item)} style={{ display: "grid", gap: "0.7rem", borderTop: "1px solid rgba(181,195,216,0.16)", paddingTop: "1rem" }}>
                        <strong>Editar dados do anúncio</strong>
                        <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                          Título
                          <input required minLength={5} maxLength={100} value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} style={inputStyle} />
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
                            <input required maxLength={60} value={editDraft.price} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} style={inputStyle} />
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
            <span style={eyebrowStyle("#EC4899")}>GOVERNANÇA E MODERAÇÃO</span>
            <h1 style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.65rem" }}>
              Painel Administrativo
            </h1>
            <p style={{ margin: "0 0 1.2rem", color: "#B5C3D8", fontSize: "0.92rem" }}>
              Painel ligado à base de dados partilhada. As ações de moderação são validadas pelo servidor e registadas na auditoria.
            </p>

            <div style={{ ...subCardStyle, marginBottom: "1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.7rem", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.98rem" }}>Sugestões de categorias e serviços</strong>
                <span style={badgeStyle(categorySuggestions.length ? "#B45309" : "#166534")}>{categorySuggestions.length} pendentes</span>
              </div>
              {categoryReviewFeedback && <div role="status" aria-live="polite" style={{ color: "#6EE7B7", fontSize: "0.84rem" }}>{categoryReviewFeedback}</div>}
              {categorySuggestionsLoading ? (
                <p style={{ margin: 0, color: "#B5C3D8", fontSize: "0.86rem" }}>A carregar sugestões…</p>
              ) : categorySuggestions.length === 0 ? (
                <p style={{ margin: 0, color: "#B5C3D8", fontSize: "0.86rem" }}>Não existem sugestões pendentes neste momento.</p>
              ) : (
                <div style={{ display: "grid", gap: "0.65rem" }}>
                  {categorySuggestions.map((suggestion) => (
                    <div key={suggestion.id} style={{ padding: "0.85rem", border: "1px solid rgba(181,195,216,0.18)", borderRadius: 10, display: "grid", gap: "0.55rem" }}>
                      <div>
                        <strong style={{ color: "#F8FAFC" }}>{suggestion.requested_category}</strong>
                        {suggestion.requested_subcategory && <span style={{ color: "#93C5FD" }}> › {suggestion.requested_subcategory}</span>}
                        {suggestion.description && <p style={{ margin: "0.35rem 0 0", color: "#B5C3D8", fontSize: "0.84rem" }}>{suggestion.description}</p>}
                        <span style={{ display: "block", marginTop: 5, color: "#8294AE", fontSize: "0.74rem" }}>Recebida em {new Date(suggestion.created_at).toLocaleDateString("pt-PT")}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button type="button" onClick={() => reviewCategorySuggestion(suggestion.id, "approved")} style={actionBtnStyle("#15803D")}>Aprovar e adicionar à lista</button>
                        <button type="button" onClick={() => reviewCategorySuggestion(suggestion.id, "rejected")} style={actionBtnStyle("#B91C1C")}>Rejeitar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                <div style={{ fontSize: "0.75rem", color: "#38D6A0" }}>Apoio a compradores, vendedores e anunciantes</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([{ id: "welcome", sender: "assistant", text: "Olá! 👋 Bem-vindo ao CaboVerde Conecta. Sou o assistente virtual e estou aqui para ajudar a divulgar os seus anúncios e serviços, esclarecer dúvidas sobre a campanha de lançamento e explicar como encontrar ou contactar anunciantes. Como posso ajudar hoje?" }]);
                    setChatInput("");
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(181,195,216,0.2)",
                    color: "#B5C3D8",
                    borderRadius: 8,
                    padding: "0.25rem 0.5rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  Nova conversa
                </button>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label="Fechar assistente"
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
            </div>

            <div
              style={{
                maxHeight: "min(52vh, 420px)",
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
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </div>
              ))}

              {chatLoading && <div role="status" aria-live="polite" style={{ alignSelf: "flex-start", color: "#8EF0C8", fontSize: "0.78rem", padding: "0.25rem 0.2rem" }}>O assistente está a preparar a resposta…</div>}
              <div ref={chatMessagesEndRef} aria-hidden="true" />
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendChatMessage(q)}
                    disabled={chatLoading}
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
                maxLength={1000}
                aria-label="Escreva a sua mensagem ao assistente"
                value={chatInput}
                disabled={chatLoading}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escreva a sua dúvida..."
                style={{ ...inputStyle, flex: 1, padding: "0.5rem 0.7rem", fontSize: "0.84rem" }}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} style={{ ...actionBtnStyle("#2563EB"), padding: "0.5rem 0.8rem", opacity: chatLoading || !chatInput.trim() ? 0.6 : 1 }}>
                {chatLoading ? "A enviar…" : "Enviar"}
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
            <button type="button" aria-label="Fechar galeria" onClick={() => setLightbox(null)} style={{ position: "absolute", top: -42, right: 0, width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,.3)", background: "rgba(21,31,51,.88)", color: "#fff", fontSize: 24, cursor: "pointer", zIndex: 2 }}>×</button>
            <div style={{ position: "relative", width: "100%", minHeight: "min(68vh, 680px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                key={lightbox.src}
                src={lightbox.src}
                alt={lightbox.title + " — fotografia " + (lightbox.index + 1)}
                style={{ maxWidth: "100%", width: "auto", maxHeight: "min(76vh, 760px)", objectFit: "contain", borderRadius: 10, boxShadow: "0 24px 80px rgba(0,0,0,.55)", animation: "conecta-gallery-fade .28s ease both" }}
              />
              {lightbox.images.length > 1 && (
                <>
                  <button type="button" aria-label="Fotografia anterior" onClick={() => setLightbox((current) => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length, src: current.images[(current.index - 1 + current.images.length) % current.images.length].url } : null)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(255,255,255,.55)", background: "rgba(7,11,24,.78)", color: "#fff", fontSize: 32, lineHeight: 1, cursor: "pointer" }}>‹</button>
                  <button type="button" aria-label="Fotografia seguinte" onClick={() => setLightbox((current) => current ? { ...current, index: (current.index + 1) % current.images.length, src: current.images[(current.index + 1) % current.images.length].url } : null)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(255,255,255,.55)", background: "rgba(7,11,24,.78)", color: "#fff", fontSize: 32, lineHeight: 1, cursor: "pointer" }}>›</button>
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
            <span style={{ color: "#9FB0C8", fontSize: "0.76rem" }}>Use as setas do teclado ou os controlos para percorrer as fotografias · Esc para fechar</span>
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