import { supabase } from "./supabase-client.js";

const IMAGE_BUCKET = "site-images";

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (typeof text === "string") element.textContent = text;
  return element;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const isValidCalendarDate = (year, month, day) => {
  const monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= monthLengths[month - 1];
};

export const normalizarDataHoraPublicacao = (value) => {
  const text = String(value || "").trim();
  const match = text.match(LOCAL_DATE_TIME_PATTERN);
  if (!match) return "";

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "00"] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  if (!isValidCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) return "";
  return `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}`;
};

export const formatarDataPublicacao = (publicadoEm, dataAlternativa = "") => {
  const normalizedDateTime = normalizarDataHoraPublicacao(publicadoEm);
  if (normalizedDateTime) {
    const match = normalizedDateTime.match(LOCAL_DATE_TIME_PATTERN);
    const [, year, month, day, hour, minute] = match;
    return `${day}/${month}/${year} • ${hour}h${minute}`;
  }

  const fallbackText = String(dataAlternativa || "").trim();
  const dateText = fallbackText.slice(0, 10);
  const match = dateText.match(DATE_PATTERN);
  if (!match) return fallbackText;

  const [, year, month, day] = match;
  if (!isValidCalendarDate(Number(year), Number(month), Number(day))) return fallbackText;
  return `${day}/${month}/${year}`;
};

export const formatarAutoresNoticia = (authors) => {
  const values = (Array.isArray(authors) ? authors : [authors])
    .map((author) => String(author || "").trim())
    .filter(Boolean);

  if (values.length <= 1) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} e ${values[values.length - 1]}`;
};

const isReadyUrl = (value) => /^(?:https?:|data:|blob:)/i.test(value) || value.startsWith("/");

export const obterUrlImagem = (path) => {
  const value = String(path || "").trim();
  if (!value || isReadyUrl(value)) return value;

  const storagePath = value.replace(/^site-images\//i, "");
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);
  return data && data.publicUrl ? data.publicUrl : "";
};

const normalizeImage = (image) => {
  if (typeof image === "string") return { path: image, legenda: "" };
  if (!image || typeof image !== "object") return { path: "", legenda: "" };

  return {
    path: image.path || image.imagem || image.src || "",
    legenda: image.legenda || image.caption || "",
  };
};

const createFigure = (imageData, resolveImage, className = "") => {
  const image = normalizeImage(imageData);
  const figure = createElement("figure", className);
  const src = resolveImage(image.path);

  if (src) {
    const img = createElement("img");
    img.src = src;
    img.alt = image.legenda || "Imagem da notícia";
    img.loading = "lazy";
    img.decoding = "async";
    figure.appendChild(img);
  }

  if (image.legenda) {
    figure.appendChild(createElement("figcaption", "", image.legenda));
  }

  return figure;
};

const normalizeBlockType = (type) => String(type || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[\s-]+/g, "_");

const renderParagraph = (block) => createElement(
  "p",
  "noticia-bloco noticia-bloco-paragrafo",
  String(block.texto || block.conteudo || ""),
);

const renderSingleImage = (block, resolveImage) => {
  const figure = createFigure(block, resolveImage, "noticia-bloco noticia-bloco-imagem");
  return figure.children.length ? figure : null;
};

const renderImageCollection = (block, resolveImage, className) => {
  const images = Array.isArray(block.imagens) ? block.imagens : [];
  const container = createElement("div", `noticia-bloco ${className}`);

  images.forEach((image) => {
    const figure = createFigure(image, resolveImage);
    if (figure.children.length) container.appendChild(figure);
  });

  return container.children.length ? container : null;
};

const renderQuote = (block) => {
  const text = String(block.texto || block.citacao || "").trim();
  if (!text) return null;

  const wrapper = createElement("div", "noticia-bloco noticia-bloco-citacao");
  wrapper.appendChild(createElement("blockquote", "", text));

  const source = String(block.fonte || block.autor || "").trim();
  if (source) wrapper.appendChild(createElement("cite", "", source));

  return wrapper;
};

const normalizeTable = (block) => {
  const headers = Array.isArray(block.cabecalhos)
    ? block.cabecalhos.map((value) => String(value ?? ""))
    : [];
  const rows = Array.isArray(block.linhas)
    ? block.linhas.filter(Array.isArray).map((row) => row.map((value) => String(value ?? "")))
    : [];
  const columnCount = Math.max(headers.length, ...rows.map((row) => row.length), 0);

  return {
    headers: Array.from({ length: columnCount }, (_, index) => headers[index] || ""),
    rows: rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] || "")),
  };
};

const renderTable = (block) => {
  const { headers, rows } = normalizeTable(block);
  if (!headers.length && !rows.length) return null;

  const wrapper = createElement("div", "noticia-bloco noticia-bloco-tabela");
  const table = createElement("table");

  if (headers.length) {
    const thead = createElement("thead");
    const headerRow = createElement("tr");
    headers.forEach((header) => {
      const cell = createElement("th", "", header);
      cell.scope = "col";
      headerRow.appendChild(cell);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  if (rows.length) {
    const tbody = createElement("tbody");
    rows.forEach((row) => {
      const tableRow = createElement("tr");
      row.forEach((cell) => tableRow.appendChild(createElement("td", "", cell)));
      tbody.appendChild(tableRow);
    });
    table.appendChild(tbody);
  }

  wrapper.appendChild(table);
  return wrapper;
};

export const renderizarBlocosNoticia = (container, blocks, options = {}) => {
  if (!container) return;

  const resolveImage = options.resolverImagem || obterUrlImagem;
  const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
  container.replaceChildren();

  normalizedBlocks.forEach((block) => {
    if (!block || typeof block !== "object") return;

    const type = normalizeBlockType(block.tipo);
    let element = null;

    if (type === "paragrafo") {
      element = renderParagraph(block);
    } else if (type === "imagem") {
      element = renderSingleImage(block, resolveImage);
    } else if (["duas_imagens", "duasimagens"].includes(type)) {
      element = renderImageCollection(block, resolveImage, "noticia-bloco-duas-imagens");
    } else if (type === "galeria") {
      element = renderImageCollection(block, resolveImage, "noticia-bloco-galeria");
    } else if (["citacao", "quote"].includes(type)) {
      element = renderQuote(block);
    } else if (type === "tabela") {
      element = renderTable(block);
    }

    if (element) container.appendChild(element);
  });

  if (!container.children.length && options.fallbackText) {
    container.appendChild(renderParagraph({ texto: options.fallbackText }));
  }
};

export const SITE_IMAGE_BUCKET = IMAGE_BUCKET;
