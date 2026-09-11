import { buscarConteudoPorId, buscarConteudosComFallback } from "./carregar-conteudos.js";
import {
  formatarAutoresNoticia,
  formatarDataPublicacao,
  normalizarDataHoraPublicacao,
  obterUrlImagem,
  renderizarBlocosNoticia,
} from "./noticia-blocos.js";

const setOptionalText = (element, value) => {
  if (!element) return;
  const text = String(value || "").trim();
  element.textContent = text;
  element.hidden = !text;
};

const getBlocks = (noticia) => {
  if (Array.isArray(noticia.blocos)) return noticia.blocos;
  if (Array.isArray(noticia.dados?.blocos)) return noticia.dados.blocos;
  return null;
};

const renderMetadata = (noticia) => {
  const normalizedAuthors = Array.isArray(noticia.autores) ? noticia.autores.filter(Boolean) : [];
  const legacyAuthor = noticia.autor || noticia.dados?.autor || "";
  const authors = normalizedAuthors.length ? normalizedAuthors : legacyAuthor ? [legacyAuthor] : [];
  const authorElement = document.getElementById("autor");
  const authorNames = document.getElementById("autor-nomes");
  if (authorElement && authorNames) {
    authorNames.textContent = formatarAutoresNoticia(authors) || "Liga ATS";
    authorElement.hidden = false;
  }

  const dateElement = document.getElementById("data-publicacao");
  if (dateElement) {
    const publishedAt = noticia.dados?.publicadoEm || noticia.publicadoEm || "";
    const fallbackDate = noticia.data || noticia.createdAt || "";
    const normalizedDateTime = normalizarDataHoraPublicacao(publishedAt);
    const date = String(fallbackDate).slice(0, 10);
    dateElement.dateTime = normalizedDateTime || date;
    setOptionalText(dateElement, formatarDataPublicacao(publishedAt, fallbackDate));
  }

  const keywordList = document.getElementById("palavras-chave");
  if (keywordList) {
    keywordList.replaceChildren();
    const keywords = Array.isArray(noticia.palavrasChave) ? noticia.palavrasChave.filter(Boolean) : [];
    keywords.forEach((keyword) => {
      const item = document.createElement("li");
      item.textContent = keyword;
      keywordList.appendChild(item);
    });
    keywordList.hidden = !keywords.length;
  }
};

const renderCover = (noticia, title) => {
  const figure = document.getElementById("imagem-capa");
  const image = document.getElementById("imagem-capa-src");
  if (!figure || !image) return;

  const src = obterUrlImagem(noticia.imagemPath || noticia.imagem || noticia.dados?.imagem || "");
  if (!src) {
    figure.hidden = true;
    image.removeAttribute("src");
    return;
  }

  image.src = src;
  image.alt = title ? `Imagem de capa: ${title}` : "Imagem de capa da notícia";
  figure.hidden = false;
};

const renderRelatedNews = async (noticia) => {
  const relatedElement = document.getElementById("related");
  if (!relatedElement) return;

  const relatedPanel = relatedElement.closest(".noticia-side");
  const pageLayout = relatedElement.closest(".noticia-conteudo");
  relatedElement.replaceChildren();
  if (relatedPanel) relatedPanel.hidden = true;
  pageLayout?.classList.add("noticia-conteudo-sem-relacionadas");

  const noticias = await buscarConteudosComFallback("noticia", "/assets/data/noticias.json");
  const relacionadas = noticias
    .filter((item) => String(item.id) !== String(noticia.id))
    .slice(0, 5);

  relacionadas.forEach((item) => {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    const title = document.createElement("span");
    const imageUrl = obterUrlImagem(item.imagemPath || item.imagem || item.dados?.imagem || "");

    link.href = `/pages/noticias-template.html?id=${encodeURIComponent(item.id)}`;
    title.className = "related-title";
    title.textContent = item.titulo || item.descricaoCurta || `Notícia ${item.id}`;
    link.appendChild(title);

    if (imageUrl) {
      const image = document.createElement("img");
      image.className = "related-thumb";
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => {
        image.remove();
        link.classList.add("related-link-sem-imagem");
      }, { once: true });
      link.appendChild(image);
    } else {
      link.classList.add("related-link-sem-imagem");
    }

    listItem.appendChild(link);
    relatedElement.appendChild(listItem);
  });

  const hasRelatedNews = relacionadas.length > 0;
  if (relatedPanel) relatedPanel.hidden = !hasRelatedNews;
  pageLayout?.classList.toggle("noticia-conteudo-sem-relacionadas", !hasRelatedNews);
};

const carregarDetalheNoticia = async () => {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  const noticia = await buscarConteudoPorId("noticia", id, "/assets/data/noticias.json");
  if (!noticia) return;

  const title = noticia.titulo || noticia.descricaoCurta || "Notícia";
  const subtitle = noticia.descricaoCurta && noticia.descricaoCurta !== title ? noticia.descricaoCurta : "";
  document.getElementById("titulo").textContent = title;
  setOptionalText(document.getElementById("subtitulo"), subtitle);
  document.title = `${title} | LIGATS`;

  renderMetadata(noticia);
  renderCover(noticia, title);

  const body = document.getElementById("corpo-noticia");
  const blocks = getBlocks(noticia);
  const legacyText = noticia.descricaoLonga || noticia.descricaoCurta || "";
  renderizarBlocosNoticia(body, blocks || [], {
    fallbackText: legacyText,
  });

  await renderRelatedNews(noticia);
};

carregarDetalheNoticia().catch((error) => {
  console.error("Erro ao carregar notícia:", error);
});
