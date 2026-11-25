import React, { useEffect, useMemo, useState } from "react";
import "./responsive.css";import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import AuthPanel from "./components/AuthPanel";
import ListingMediaPicker from "./components/ListingMediaPicker";
import ListingMediaManager from "./components/ListingMediaManager";

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
  "Como funcionam as 50 vagas gratuitas?",
  "Quanto custa após as 50 vagas e como pagar?",
  "Como falar com o suporte oficial?",
];

export default function App() {
  const [tab, setTab] = useState<"home" | "publish" | "account" | "admin">("home");
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
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
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (!error) setAuthUser(data.user);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
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

  const accountListings = useMemo(
    () => authUser ? getPreviewListingsByEmail(listings, authUser.email ?? "") : [],
    [listings, authUser]
  );
  const accountListingCounts = useMemo(
    () => countListingsByStatus(accountListings),
    [accountListings]
  );

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Olá! Sou o assistente do CaboVerde Conecta. Posso esclarecer dúvidas sobre a campanha de lançamento, publicação de anúncios e contacto direto. Nesta pré-visualização, os pagamentos e o suporte ainda não estão ativos.",
    },
  ]);

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

  function buildAssistantReply(rawText: string): string {
    const t = rawText.toLowerCase();
    if (t.includes("gratuit") || t.includes("50") || t.includes("vaga")) {
      return `A campanha de lançamento oferece até 50 vagas gratuitas. Neste momento, o servidor indica ${freeSlotsRemaining} vaga(s) disponível(is). Ao submeter um anúncio, o sistema reserva a vaga de forma segura e guarda o anúncio como pendente de análise. Depois da campanha, o preço previsto é 1.500 CVE por anúncio.`;
    }
    if (t.includes("1.500") || t.includes("1500") || t.includes("pagar") || t.includes("bca") || t.includes("bcn") || t.includes("hotmart") || t.includes("visa")) {
      return "Após a campanha, o preço previsto é 1.500 CVE por anúncio. O pagamento ainda não está ativo nesta versão de pré-lançamento. Não faça transferências nem envie comprovativos através desta pré-visualização.";
    }
    if (t.includes("suporte") || t.includes("contacto") || t.includes("whatsapp") || t.includes("telefone")) {
      return "O contacto entre interessados e anunciantes é direto através dos dados indicados em cada anúncio. O canal de suporte da plataforma ainda não está ligado nesta pré-visualização.";
    }
    if (t.includes("estado") || t.includes("pendente") || t.includes("publicar")) {
      return "Os estados de pagamento (pending, confirmed, rejected) e de anúncio (pending, published, rejected, suspended) são separados. Novos anúncios entram em análise até confirmação e publicação no painel administrativo.";
    }
    return `O CaboVerde Conecta reúne classificados, serviços, imóveis, viaturas, hospedagem e oportunidades em Cabo Verde. A campanha prevê até 50 anúncios gratuitos; neste momento há ${freeSlotsRemaining} vaga(s) disponível(is), segundo o servidor. Os anúncios submetidos ficam pendentes de análise. Depois da campanha, o valor previsto é 1.500 CVE.`;
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
                {Array.from(new Set([...Object.keys(CATEGORIES), ...listings.map((item) => item.category).filter(Boolean)])).map((c) => (
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
                {(category ? Array.from(new Set([...(CATEGORIES[category] || []), ...listings.filter((item) => item.category === category).map((item) => item.subcategory).filter(Boolean)])) : []).map((sub) => (
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
                  <div style={imageFrameStyle}>
                    {mediaByListing[ad.id]?.find((media) => media.type === "image") ? (
                      <img src={mediaByListing[ad.id].find((media) => media.type === "image")!.url} alt={ad.title} onClick={() => setLightbox({ src: mediaByListing[ad.id].find((media) => media.type === "image")!.url, title: ad.title })} style={cardImageStyle} />
                    ) : <img src={ad.image} alt={ad.title} onClick={() => setLightbox({ src: ad.image, title: ad.title })} style={cardImageStyle} />}
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
                    {(mediaByListing[ad.id] || []).length > 1 && <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>{mediaByListing[ad.id].slice(1).map((media) => media.type === "video" ? <video key={media.id} src={media.url} controls style={{ width: 90, height: 68, objectFit: "cover", borderRadius: 7 }} /> : <img key={media.id} src={media.url} alt={ad.title} onClick={() => setLightbox({ src: media.url, title: ad.title })} style={{ width: 90, height: 68, objectFit: "cover", borderRadius: 7, cursor: "zoom-in" }} />)}</div>}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                      {ad.whatsapp && (
                        <a
                          href={`https://wa.me/${ad.whatsapp.replace(/\D/g, "")}`}
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
                      setPubSubcategory(CATEGORIES[nextCat]?.[0] || "Geral");
                      setUseCustomSubcategory(false);
                      setCustomSubcategory("");
                    }}
                    style={{ ...inputStyle, opacity: 1 }}
                  >
                    {Object.keys(CATEGORIES).map((c) => (
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
                        {(CATEGORIES[pubCategory] || []).map((sub) => <option key={sub} value={sub}>{sub}</option>)}
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
                <AuthPanel user={authUser} onSignedOut={() => { setAccountEmail(""); setListings([]); }} />
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
                            onClick={() => setLightbox({ src: item.image, title: item.title })}
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
                            <select value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value, subcategory: CATEGORIES[e.target.value]?.[0] || "" })} style={inputStyle}>
                              {Object.keys(CATEGORIES).map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: "0.3rem", color: "#B5C3D8", fontSize: "0.82rem" }}>
                            Subcategoria
                            <select value={editDraft.subcategory} onChange={(e) => setEditDraft({ ...editDraft, subcategory: e.target.value })} style={inputStyle}>
                              {(CATEGORIES[editDraft.category] || []).map((value) => <option key={value} value={value}>{value}</option>)}
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