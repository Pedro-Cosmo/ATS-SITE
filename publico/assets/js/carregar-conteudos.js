import { supabase } from "./supabase-client.js";

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

export const normalizarConteudo = (row) => {
  const dados = row && row.dados && typeof row.dados === "object" && !Array.isArray(row.dados)
    ? row.dados
    : {};

  return {
    ...dados,
    id: row.slug || dados.id || row.id,
    supabaseId: row.id,
    slug: row.slug || dados.slug || "",
    tipo: row.tipo || dados.tipo || "",
    titulo: row.titulo || dados.titulo || "",
    descricaoCurta: row.descricao_curta ?? dados.descricaoCurta ?? "",
    descricaoLonga: row.descricao_longa ?? dados.descricaoLonga ?? "",
    autores: normalizeArray(row.autores ?? dados.autores),
    palavrasChave: normalizeArray(row.palavras_chave ?? dados.palavrasChave),
    orientador: row.orientador ?? dados.orientador ?? "",
    curso: row.curso ?? dados.curso ?? "",
    ano: row.ano ?? dados.ano ?? null,
    data: row.data_publicacao ?? dados.data ?? "",
    imagem: row.imagem_path || dados.imagem || "",
    pdf: row.pdf_path || dados.pdf || "",
    publicado: row.publicado ?? dados.publicado ?? true,
    createdAt: row.created_at || dados.createdAt || "",
  };
};

const buscarFallback = async (fallbackUrl) => {
  if (!fallbackUrl) return [];

  try {
    const response = await fetch(fallbackUrl, { cache: "force-cache" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar fallback local:", error);
    return [];
  }
};

export async function buscarConteudos(tipo) {
  const { data, error } = await supabase
    .from("conteudos")
    .select("*")
    .eq("tipo", tipo)
    .eq("publicado", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar conteudos no Supabase:", error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizarConteudo) : [];
}

export async function buscarConteudosComFallback(tipo, fallbackUrl) {
  const supabaseData = await buscarConteudos(tipo);
  if (supabaseData.length) return supabaseData;

  const fallbackData = await buscarFallback(fallbackUrl);
  return fallbackData.filter((item) => !item.tipo || item.tipo === tipo);
}

export async function buscarConteudoPorId(tipo, id, fallbackUrl) {
  const conteudos = await buscarConteudosComFallback(tipo, fallbackUrl);
  const idNormalizado = String(id || "");

  return conteudos.find((item) => (
    String(item.id) === idNormalizado
    || String(item.slug || "") === idNormalizado
    || String(item.supabaseId || "") === idNormalizado
  )) || null;
}
