import { buscarConteudoPorId, buscarConteudosComFallback } from "./carregar-conteudos.js";

const carregarDetalheArtigo = async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  const artigo = await buscarConteudoPorId("artigo", id, "/assets/data/dados.json");
  if (!artigo) return;

  document.getElementById("titulo").textContent = artigo.titulo || "Sem titulo";
  document.getElementById("descricao-longa").textContent = artigo.descricaoLonga || artigo.descricaoCurta || "";
  document.title = artigo.titulo || "Artigo";

  const autorEl = document.getElementById("autor");
  if (autorEl) {
    autorEl.textContent = Array.isArray(artigo.autores) && artigo.autores.length
      ? `Autor(es): ${artigo.autores.join(", ")}`
      : "Liga ATS";
  }

  const relatedEl = document.getElementById("related");
  if (!relatedEl) return;

  const artigos = await buscarConteudosComFallback("artigo", "/assets/data/dados.json");
  artigos
    .filter((item) => String(item.id) !== String(artigo.id))
    .slice(0, 5)
    .forEach((item) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = `/pages/artigo-template.html?id=${item.id}`;
      link.textContent = item.titulo || `Artigo ${item.id}`;
      li.appendChild(link);
      relatedEl.appendChild(li);
    });
};

carregarDetalheArtigo().catch((error) => {
  console.error("Erro ao carregar artigo:", error);
});
