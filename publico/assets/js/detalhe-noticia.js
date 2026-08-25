import { buscarConteudoPorId, buscarConteudosComFallback } from "./carregar-conteudos.js";

const carregarDetalheNoticia = async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  const noticia = await buscarConteudoPorId("noticia", id, "/assets/data/noticias.json");
  if (!noticia) return;

  const titulo = noticia.titulo || noticia.descricaoCurta || "Noticia";
  const descricaoLonga = noticia.descricaoLonga || noticia.descricaoCurta || "";

  document.getElementById("titulo").textContent = titulo;
  document.getElementById("descricao-longa").textContent = descricaoLonga;
  document.title = titulo;

  const autorEl = document.getElementById("autor");
  if (autorEl) {
    autorEl.textContent = Array.isArray(noticia.autores) && noticia.autores.length
      ? `Por ${noticia.autores.join(", ")}`
      : "Liga ATS";
  }

  const relatedEl = document.getElementById("related");
  if (!relatedEl) return;

  const noticias = await buscarConteudosComFallback("noticia", "/assets/data/noticias.json");
  noticias
    .filter((item) => String(item.id) !== String(noticia.id))
    .slice(0, 5)
    .forEach((item) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = `/pages/noticias-template.html?id=${item.id}`;
      link.textContent = item.titulo || item.descricaoCurta || `Noticia ${item.id}`;
      li.appendChild(link);
      relatedEl.appendChild(li);
    });
};

carregarDetalheNoticia().catch((error) => {
  console.error("Erro ao carregar noticia:", error);
});
