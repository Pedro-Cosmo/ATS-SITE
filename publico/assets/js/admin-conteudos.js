import { supabase } from "./supabase-client.js";

export function gerarSlug(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function montarLinhaConteudo(objeto) {
  const slugBase = gerarSlug(objeto.titulo);

  return {
    tipo: objeto.tipo,
    slug: `${objeto.tipo}-${slugBase}`,
    titulo: objeto.titulo,
    descricao_curta: objeto.descricaoCurta || null,
    descricao_longa: objeto.descricaoLonga || null,
    autores: objeto.autores || [],
    palavras_chave: objeto.palavrasChave || [],
    orientador: objeto.orientador || null,
    curso: objeto.curso || null,
    ano: objeto.ano || null,
    data_publicacao: objeto.data || null,
    imagem_path: objeto.imagem || null,
    pdf_path: objeto.pdf || null,
    dados: objeto,
    publicado: true,
  };
}

export async function salvarConteudo(objeto) {
  const linha = montarLinhaConteudo(objeto);

  const { data, error } = await supabase
    .from("conteudos")
    .insert(linha)
    .select()
    .single();

  if (error) {
    console.error("Erro ao salvar conteudo:", error);
    throw error;
  }

  return data;
}
