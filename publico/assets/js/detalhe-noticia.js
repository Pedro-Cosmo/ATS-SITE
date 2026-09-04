import { buscarConteudoPorId, buscarConteudosComFallback } from "./carregar-conteudos.js";
import { obterUrlImagem, renderizarBlocosNoticia } from "./noticia-blocos.js";

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const formatDate = (value) => {
  if (!isValidDate(value)) return String(value || "");
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

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
  const authors = Array.isArray(noticia.autores)
    ? noticia.autores.filter(Boolean)
    : noticia.autor
      ? [noticia.autor]
      : [];
  setOptionalText(document.getElementById("autor"), authors.length ? `Por ${authors.join(", ")}` : "Liga ATS");

  const dateElement = document.getElementById("data-publicacao");
  if (dateElement) {
    const date = String(noticia.data || noticia.createdAt || "").slice(0, 10);
    dateElement.dateTime = isValidDate(date) ? date : "";
    setOptionalText(dateElement, formatDate(date));
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

  relatedElement.replaceChildren();
  const noticias = await buscarConteudosComFallback("noticia", "/assets/data/noticias.json");
  noticias
    .filter((item) => String(item.id) !== String(noticia.id))
    .slice(0, 5)
    .forEach((item) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = `/pages/noticias-template.html?id=${encodeURIComponent(item.id)}`;
      link.textContent = item.titulo || item.descricaoCurta || `Notícia ${item.id}`;
      listItem.appendChild(link);
      relatedElement.appendChild(listItem);
    });
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
    fallbackText: blocks ? "" : legacyText,
  });

  await renderRelatedNews(noticia);
};

carregarDetalheNoticia().catch((error) => {
  console.error("Erro ao carregar notícia:", error);
});
