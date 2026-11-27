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
  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    for (const related of RELATED_TERMS[token] ?? []) expanded.add(normalizeSearchText(related));
  }
  const fieldTokens = new Set(normalizedFields.split(/\s+/));
  const matched = [...expanded].filter((term) => {
    if (term.includes(" ")) return normalizedFields.includes(term);
    return fieldTokens.has(term);
  });
  const directTokenMatches = tokens.filter((token) => fieldTokens.has(token)).length;
  if (directTokenMatches > 0) return "related";
  if (matched.length > 0) return "related";
  return "none";
}

export function getRelatedSearchReason(query: string): string {
  const normalized = normalizeSearchText(query);
  if (normalized.includes("peix") || normalized.includes("pescad")) return "Alternativa relacionada: outros produtos do mar, como mariscos.";
  if (normalized.includes("carro") || normalized.includes("viatura")) return "Alternativa relacionada: outros veículos disponíveis.";
  if (normalized.includes("casa") || normalized.includes("apartamento") || normalized.includes("alugar") || normalized.includes("arrendar")) return "Alternativa relacionada: outros tipos de imóveis e alojamento.";
  return "Alternativa relacionada com a sua pesquisa.";
}
