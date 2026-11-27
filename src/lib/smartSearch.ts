const RELATED_TERMS: Record<string, string[]> = {
  peixe: ["peixes", "pescado", "pescados", "marisco", "mariscos", "frutos do mar", "camarão", "camarões", "lagosta", "lagostas", "polvo", "lula", "atum", "garoupa", "cavala", "sardinha"],
  peixes: ["peixe", "pescado", "pescados", "marisco", "mariscos", "frutos do mar", "camarão", "lagosta", "polvo", "lula"],
  marisco: ["mariscos", "peixe", "peixes", "pescado", "frutos do mar", "camarão", "lagosta", "polvo", "lula"],
  mariscos: ["marisco", "peixe", "peixes", "pescado", "frutos do mar", "camarão", "lagosta", "polvo", "lula"],
  carro: ["carros", "viatura", "viaturas", "automóvel", "automóveis", "motorizada", "mota"],
  carros: ["carro", "viatura", "viaturas", "automóvel", "automóveis"],
  viatura: ["viaturas", "carro", "carros", "automóvel", "automóveis"],
  casa: ["casas", "moradia", "moradias", "apartamento", "apartamentos", "imóvel", "imóveis"],
  casas: ["casa", "moradia", "moradias", "apartamento", "apartamentos", "imóveis"],
  apartamento: ["apartamentos", "casa", "casas", "moradia", "imóvel", "imóveis", "estúdio"],
  alugar: ["arrendar", "arrendamento", "renda", "aluguer"],
  arrendar: ["alugar", "arrendamento", "renda", "aluguer"],
  eletricista: ["eletricistas", "eletricidade", "instalação elétrica", "reparação elétrica"],
  canalizador: ["canalizadores", "canalização", "canos", "canalizador"],
  pedreiro: ["pedreiros", "construção", "obras", "alvenaria"],
  mecânico: ["mecânicos", "oficina", "reparação automóvel", "automóvel"],
  empregada: ["limpeza", "limpezas", "doméstica", "serviços domésticos"],
  emprego: ["trabalho", "vagas", "recrutamento", "oportunidade profissional"],
  trabalho: ["emprego", "vagas", "recrutamento"],
  telemóvel: ["telefone", "smartphone", "celular"],
  telefone: ["telemóvel", "smartphone", "celular"],
};

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt").replace(/[^a-z0-9]+/g, " ").trim();
}

export function getSearchMatch(query: string, fields: string[]): "exact" | "related" | "none" {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return "exact";
  const normalizedFields = normalizeSearchText(fields.join(" "));
  if (normalizedFields.includes(normalizedQuery)) return "exact";

  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 1);
  if (!tokens.length) return "none";
  const fieldTokens = new Set(normalizedFields.split(/\s+/));
  const everyQueryTermIsCovered = tokens.every((token) => {
    if (fieldTokens.has(token)) return true;
    return (RELATED_TERMS[token] ?? []).some((related) => {
      const normalizedRelated = normalizeSearchText(related);
      return normalizedRelated.includes(" ")
        ? normalizedFields.includes(normalizedRelated)
        : fieldTokens.has(normalizedRelated);
    });
  });
  return everyQueryTermIsCovered ? "related" : "none";
}

export function getRelatedSearchReason(query: string): string {
  const normalized = normalizeSearchText(query);
  if (normalized.includes("peix") || normalized.includes("pescad")) return "Alternativa relacionada: outros produtos do mar, como mariscos.";
  if (normalized.includes("carro") || normalized.includes("viatura")) return "Alternativa relacionada: outros veículos disponíveis.";
  if (normalized.includes("casa") || normalized.includes("apartamento") || normalized.includes("alugar") || normalized.includes("arrendar")) return "Alternativa relacionada: outros tipos de imóveis e alojamento.";
  return "Alternativa relacionada com a sua pesquisa.";
}
