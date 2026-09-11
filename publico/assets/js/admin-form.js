import { salvarConteudo } from "./admin-conteudos.js";
import { definirPdfTcc, limparPdfTcc, uploadPdfTcc } from "./admin-tccs.js";
import { supabase } from "./supabase-client.js";
import {
  formatarAutoresNoticia,
  formatarDataPublicacao,
  normalizarDataHoraPublicacao,
  renderizarBlocosNoticia,
  SITE_IMAGE_BUCKET,
} from "./noticia-blocos.js";

(() => {
  const CONFIGS = {
    noticias: {
      tipo: "noticia",
      prefix: "noticia",
      imageFolder: "noticias",
      requiresAuthor: false,
      requiresPdf: false,
      requiresYear: false,
      requiresDate: true,
      saveLabel: "notícia",
    },
    artigos: {
      tipo: "artigo",
      prefix: "artigo",
      imageFolder: "artigos",
      storagePdfFolder: "artigos",
      requiresAuthor: true,
      requiresPdf: true,
      requiresYear: true,
      requiresDate: false,
      saveLabel: "artigo",
    },
    tccs: {
      tipo: "tcc",
      prefix: "tcc",
      imageFolder: "tcc",
      storagePdfFolder: "tccs",
      requiresAuthor: true,
      requiresPdf: true,
      requiresYear: true,
      requiresDate: false,
      saveLabel: "TCC",
    },
  };

  const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
  const PDF_EXTENSIONS = [".pdf"];

  const state = {
    files: {
      imagem: null,
      pdf: null,
    },
    imagePreviewUrl: "",
    blockPreviewUrls: new Map(),
    blockSequence: 0,
  };

  const getConfig = (page) => CONFIGS[page.dataset.adminContentType] || CONFIGS.noticias;

  const slugify = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const generateId = (title, config) => `${config.prefix}-${slugify(title) || "sem-titulo"}`;

  const getFileExtension = (fileName) => {
    const match = String(fileName || "").match(/\.[a-z0-9]+$/i);
    return match ? match[0].toLowerCase() : "";
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
  };

  const createButton = (text, className = "admin-button admin-button-secondary") => {
    const button = createElement("button", className, text);
    button.type = "button";
    return button;
  };

  const setStatus = (element, message, type = "") => {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", type === "error");
    element.classList.toggle("is-success", type === "success");
    element.classList.toggle("is-warning", type === "warning");
  };

  const getFieldValue = (page, name) => {
    const field = page.querySelector(`[data-admin-field="${name}"]`);
    return field ? field.value.trim() : "";
  };

  const notifyPreview = (page) => {
    page.dispatchEvent(new CustomEvent("admin:preview-change"));
  };

  const addRepeatItem = (control, value, page) => {
    const text = String(value || "").trim();
    if (!text) return;

    const items = control.querySelector("[data-repeat-items]");
    if (!items) return;

    const chip = createElement("span", "admin-repeat-chip");
    chip.dataset.repeatValue = text;
    chip.appendChild(document.createTextNode(text));

    const remove = createButton("×", "");
    remove.setAttribute("aria-label", `Remover ${text}`);
    remove.addEventListener("click", () => {
      chip.remove();
      notifyPreview(page);
    });

    chip.appendChild(remove);
    items.appendChild(chip);
    notifyPreview(page);
  };

  const setupRepeatLists = (page) => {
    page.querySelectorAll("[data-repeat-list]").forEach((control) => {
      const input = control.querySelector("[data-repeat-input]");
      const addButton = control.querySelector("[data-repeat-add]");

      const addCurrentValue = () => {
        if (!input) return;
        addRepeatItem(control, input.value, page);
        input.value = "";
        input.focus();
      };

      addButton?.addEventListener("click", addCurrentValue);
      input?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        addCurrentValue();
      });
    });
  };

  const getRepeatValues = (page, name) => {
    const control = page.querySelector(`[data-repeat-list="${name}"]`);
    if (!control) return [];

    const values = Array.from(control.querySelectorAll("[data-repeat-value]"))
      .map((item) => item.dataset.repeatValue.trim())
      .filter(Boolean);
    const input = control.querySelector("[data-repeat-input]");
    const pendingValue = input ? input.value.trim() : "";

    return [...values, pendingValue].filter(Boolean);
  };

  const clearRepeatLists = (page) => {
    page.querySelectorAll("[data-repeat-list]").forEach((control) => {
      control.querySelector("[data-repeat-items]")?.replaceChildren();
      const input = control.querySelector("[data-repeat-input]");
      if (input) input.value = "";
    });
  };

  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const isNumericYear = (value) => /^\d{4}$/.test(String(value || "").trim());

  const getBlockImagePath = (input, preview) => {
    if (!input) return "";
    if (preview && state.blockPreviewUrls.has(input)) return state.blockPreviewUrls.get(input);
    return input.dataset.storagePath || "";
  };

  const readImageData = (container, preview) => {
    const input = container.querySelector("[data-news-image-input]");
    const caption = container.querySelector("[data-news-image-caption]");
    return {
      path: getBlockImagePath(input, preview),
      legenda: caption ? caption.value.trim() : "",
    };
  };

  const buildNewsBlocks = (page, preview = false) => Array.from(page.querySelectorAll("[data-news-block]"))
    .map((block) => {
      const type = block.dataset.blockType;

      if (type === "paragrafo") {
        return { tipo: type, texto: block.querySelector("textarea")?.value.trim() || "" };
      }

      if (type === "imagem") {
        return { tipo: type, ...readImageData(block, preview) };
      }

      if (type === "duas_imagens" || type === "galeria") {
        return {
          tipo: type,
          imagens: Array.from(block.querySelectorAll("[data-news-image-item]"))
            .map((item) => readImageData(item, preview)),
        };
      }

      if (type === "citacao") {
        return {
          tipo: type,
          texto: block.querySelector("[data-quote-text]")?.value.trim() || "",
          fonte: block.querySelector("[data-quote-source]")?.value.trim() || "",
        };
      }

      if (type === "tabela") {
        return {
          tipo: type,
          cabecalhos: Array.from(block.querySelectorAll("[data-table-header]"))
            .map((input) => input.value.trim()),
          linhas: Array.from(block.querySelectorAll("[data-table-row]"))
            .map((row) => Array.from(row.querySelectorAll("[data-table-cell]"))
              .map((input) => input.value.trim())),
        };
      }

      return null;
    })
    .filter(Boolean);

  const buildContentObject = (page, config, preview = false) => {
    const title = getFieldValue(page, "titulo");
    const imageInput = page.querySelector('[data-file-input="imagem"]');
    const imagePath = preview && state.imagePreviewUrl
      ? state.imagePreviewUrl
      : imageInput?.dataset.storagePath || "";
    const item = {
      id: generateId(title, config),
      tipo: config.tipo,
      titulo: title,
      descricaoCurta: getFieldValue(page, "descricaoCurta"),
      imagem: imagePath,
      autores: getRepeatValues(page, "autores"),
      palavrasChave: getRepeatValues(page, "palavrasChave"),
    };

    if (config.tipo === "noticia") {
      const publicationInput = getFieldValue(page, "publicadoEm");
      item.publicadoEm = normalizarDataHoraPublicacao(publicationInput) || publicationInput;
      item.data = publicationInput.slice(0, 10);
      item.blocos = buildNewsBlocks(page, preview);
      return item;
    }

    const year = getFieldValue(page, "ano");
    item.descricaoLonga = getFieldValue(page, "descricaoLonga");
    item.pdf = page.querySelector('[data-file-input="pdf"]')?.dataset.storagePath || "";
    item.ano = isNumericYear(year) ? Number(year) : year;

    if (config.tipo === "tcc") {
      item.orientador = getFieldValue(page, "orientador");
      item.curso = getFieldValue(page, "curso");
    }

    return item;
  };

  const validateNewsBlocks = (blocks) => {
    const errors = [];

    if (!blocks.length) {
      errors.push("Adicione ao menos um bloco ao corpo da notícia.");
      return errors;
    }

    blocks.forEach((block, index) => {
      const label = `Bloco ${index + 1}`;
      if (block.tipo === "paragrafo" && !block.texto) errors.push(`${label}: escreva o parágrafo.`);
      if (block.tipo === "imagem" && !block.path) errors.push(`${label}: selecione a imagem.`);
      if (block.tipo === "duas_imagens" && block.imagens.some((image) => !image.path)) {
        errors.push(`${label}: selecione as duas imagens.`);
      }
      if (block.tipo === "galeria" && (!block.imagens.length || block.imagens.some((image) => !image.path))) {
        errors.push(`${label}: selecione todas as imagens da galeria.`);
      }
      if (block.tipo === "citacao" && !block.texto) errors.push(`${label}: escreva a citação.`);
      if (block.tipo === "tabela" && (!block.cabecalhos.length || !block.linhas.length)) {
        errors.push(`${label}: mantenha ao menos uma linha e uma coluna.`);
      }
    });

    return errors;
  };

  const validateContent = (item, config) => {
    const errors = [];
    const warnings = [];

    if (!item.titulo) errors.push("Informe o título.");
    if (!item.descricaoCurta) errors.push("Informe a descrição curta.");
    if (config.requiresAuthor && !item.autores.length) errors.push("Adicione ao menos um autor.");
    if (config.requiresYear && !isNumericYear(item.ano)) errors.push("Informe um ano numérico com 4 dígitos.");
    if (config.requiresDate && (!isValidDate(item.data) || !normalizarDataHoraPublicacao(item.publicadoEm))) {
      errors.push("Informe uma data e hora de publicação válidas.");
    }
    if (config.requiresPdf && !state.files.pdf && !item.pdf) errors.push("Selecione um PDF.");
    if (config.tipo === "noticia") errors.push(...validateNewsBlocks(item.blocos));
    if (!item.imagem) warnings.push("Imagem de capa não selecionada. Ela é opcional, mas recomendada.");

    return { errors, warnings };
  };

  const addPreviewLine = (list, label, value, isLink = false) => {
    if (!value) return;
    const term = createElement("dt", "", label);
    const description = createElement("dd");

    if (isLink) {
      const link = createElement("a", "", value);
      link.href = value;
      link.target = "_blank";
      link.rel = "noopener";
      description.appendChild(link);
    } else {
      description.textContent = value;
    }

    list.append(term, description);
  };

  const renderNewsPreview = (container, item) => {
    container.replaceChildren();
    const article = createElement("article", "admin-news-preview");
    const header = createElement("header", "admin-news-preview-header");
    header.appendChild(createElement("h3", "", item.titulo || "Título da notícia"));
    header.appendChild(createElement(
      "p",
      "admin-preview-description admin-news-preview-subtitle",
      item.descricaoCurta || "Subtítulo da notícia",
    ));

    const meta = createElement("div", "admin-news-preview-meta");
    const author = createElement("p", "admin-news-preview-author");
    author.append(
      document.createTextNode("Por "),
      createElement("strong", "", formatarAutoresNoticia(item.autores) || "Liga ATS"),
    );
    meta.appendChild(author);

    const publicationLabel = formatarDataPublicacao(item.publicadoEm, item.data);
    if (publicationLabel) {
      const publication = createElement("time", "", publicationLabel);
      publication.dateTime = normalizarDataHoraPublicacao(item.publicadoEm) || item.data;
      meta.appendChild(publication);
    }
    header.appendChild(meta);
    article.appendChild(header);

    if (item.imagem) {
      const cover = createElement("img", "admin-news-preview-cover");
      cover.src = item.imagem;
      cover.alt = item.titulo || "Imagem de capa da notícia";
      article.appendChild(cover);
    }

    const body = createElement("div", "noticia-blocos admin-news-preview-body");
    renderizarBlocosNoticia(body, item.blocos, { resolverImagem: (path) => path });
    if (!body.children.length) {
      body.appendChild(createElement("p", "admin-empty", "Adicione blocos para visualizar o corpo da notícia."));
    }
    article.appendChild(body);

    if (item.palavrasChave.length) {
      const keywords = createElement("ul", "admin-news-preview-keywords");
      item.palavrasChave.forEach((keyword) => keywords.appendChild(createElement("li", "", keyword)));
      article.appendChild(keywords);
    }
    container.appendChild(article);
  };

  const renderStandardPreview = (container, item) => {
    container.replaceChildren();
    const title = createElement("h3", "", item.titulo || "Sem título");
    const description = createElement("p", "admin-preview-description", item.descricaoCurta || "Sem descrição curta.");
    const list = createElement("dl", "admin-preview-list");
    addPreviewLine(list, "Tipo", item.tipo);
    addPreviewLine(list, "Autores", item.autores.join(", "));
    addPreviewLine(list, "Palavras-chave", item.palavrasChave.join(", "));
    addPreviewLine(list, "Ano", item.ano || "");
    addPreviewLine(list, "Orientador", item.orientador || "");
    addPreviewLine(list, "Curso", item.curso || "");
    addPreviewLine(list, "PDF", item.pdf || "", true);
    container.append(title, description);

    if (item.imagem) {
      const image = createElement("img", "admin-preview-image");
      image.src = item.imagem;
      image.alt = item.titulo || "Prévia da imagem";
      container.appendChild(image);
    }

    container.appendChild(list);
  };

  const renderCurrentPreview = (page, config, elements) => {
    if (!elements.contentPreview) return;
    const item = buildContentObject(page, config, true);
    if (config.tipo === "noticia") renderNewsPreview(elements.contentPreview, item);
    else renderStandardPreview(elements.contentPreview, item);
  };

  const updateBlockPreviewUrl = (input, file) => {
    const previous = state.blockPreviewUrls.get(input);
    if (previous) URL.revokeObjectURL(previous);
    state.blockPreviewUrls.delete(input);

    if (file) state.blockPreviewUrls.set(input, URL.createObjectURL(file));
  };

  const cleanupBlockPreviews = (container) => {
    container.querySelectorAll("[data-news-image-input]").forEach((input) => {
      const previewUrl = state.blockPreviewUrls.get(input);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      state.blockPreviewUrls.delete(input);
    });
  };

  const setupNewsImageInput = (input, feedback, page, elements) => {
    input.addEventListener("change", () => {
      const file = input.files[0] || null;
      const extension = getFileExtension(file?.name);
      input.dataset.storagePath = "";

      if (file && !IMAGE_EXTENSIONS.includes(extension)) {
        input.value = "";
        updateBlockPreviewUrl(input, null);
        feedback.textContent = "Use uma imagem JPG, PNG ou WEBP.";
        setStatus(elements.formStatus, "Imagem inválida. Use JPG, PNG ou WEBP.", "error");
        notifyPreview(page);
        return;
      }

      updateBlockPreviewUrl(input, file);
      feedback.textContent = file ? `${file.name} (${formatBytes(file.size)})` : "";
      setStatus(elements.formStatus, "");
      notifyPreview(page);
    });
  };

  const createNewsImageItem = (page, elements, label, removable = false) => {
    const item = createElement("div", "admin-block-image-item");
    item.dataset.newsImageItem = "";
    const field = createElement("label", "admin-field admin-block-file");
    field.appendChild(createElement("span", "", label));

    const input = createElement("input");
    input.type = "file";
    input.accept = ".jpg,.jpeg,.png,.webp";
    input.dataset.newsImageInput = "";
    const feedback = createElement("small", "admin-file-feedback");
    setupNewsImageInput(input, feedback, page, elements);
    field.append(input, feedback);

    const captionField = createElement("label", "admin-field");
    captionField.appendChild(createElement("span", "", "Legenda (opcional)"));
    const caption = createElement("input");
    caption.type = "text";
    caption.dataset.newsImageCaption = "";
    captionField.appendChild(caption);
    item.append(field, captionField);

    if (removable) {
      const remove = createButton("Remover imagem", "admin-button admin-button-danger admin-block-remove-image");
      remove.addEventListener("click", () => {
        cleanupBlockPreviews(item);
        item.remove();
        notifyPreview(page);
      });
      item.appendChild(remove);
    }

    return item;
  };

  const updateBlockControls = (list) => {
    const blocks = Array.from(list.querySelectorAll(":scope > [data-news-block]"));
    blocks.forEach((block, index) => {
      block.querySelector("[data-block-title]").textContent = `${index + 1}. ${block.dataset.blockLabel}`;
      block.querySelector("[data-block-up]").disabled = index === 0;
      block.querySelector("[data-block-down]").disabled = index === blocks.length - 1;
    });
  };

  const createTableEditor = (block, page) => {
    const table = createElement("table", "admin-editable-table");
    const thead = createElement("thead");
    const headerRow = createElement("tr");
    const tbody = createElement("tbody");
    thead.appendChild(headerRow);
    table.append(thead, tbody);

    const createTableInput = (kind, value = "") => {
      const input = createElement("input");
      input.type = "text";
      input.value = value;
      input.dataset[kind] = "";
      return input;
    };

    const addColumn = () => {
      const th = createElement("th");
      th.appendChild(createTableInput("tableHeader", `Coluna ${headerRow.children.length + 1}`));
      headerRow.appendChild(th);
      Array.from(tbody.rows).forEach((row) => {
        const cell = row.insertCell();
        cell.appendChild(createTableInput("tableCell"));
      });
      notifyPreview(page);
    };

    const removeColumn = () => {
      if (headerRow.children.length <= 1) return;
      headerRow.lastElementChild.remove();
      Array.from(tbody.rows).forEach((row) => row.lastElementChild?.remove());
      notifyPreview(page);
    };

    const addRow = () => {
      const row = createElement("tr");
      row.dataset.tableRow = "";
      Array.from({ length: headerRow.children.length }).forEach(() => {
        const cell = createElement("td");
        cell.appendChild(createTableInput("tableCell"));
        row.appendChild(cell);
      });
      tbody.appendChild(row);
      notifyPreview(page);
    };

    const removeRow = () => {
      if (tbody.rows.length <= 1) return;
      tbody.lastElementChild.remove();
      notifyPreview(page);
    };

    addColumn();
    addColumn();
    addRow();
    addRow();

    const actions = createElement("div", "admin-table-actions");
    const addRowButton = createButton("Adicionar linha");
    const addColumnButton = createButton("Adicionar coluna");
    const removeRowButton = createButton("Remover linha", "admin-button admin-button-danger");
    const removeColumnButton = createButton("Remover coluna", "admin-button admin-button-danger");
    addRowButton.addEventListener("click", addRow);
    addColumnButton.addEventListener("click", addColumn);
    removeRowButton.addEventListener("click", removeRow);
    removeColumnButton.addEventListener("click", removeColumn);
    actions.append(addRowButton, addColumnButton, removeRowButton, removeColumnButton);

    const scroll = createElement("div", "admin-table-scroll");
    scroll.appendChild(table);
    block.append(scroll, actions);
  };

  const createNewsBlock = (type, page, elements) => {
    const labels = {
      paragrafo: "Parágrafo",
      imagem: "Imagem",
      duas_imagens: "Duas imagens",
      galeria: "Galeria",
      citacao: "Citação",
      tabela: "Tabela",
    };
    const list = page.querySelector("[data-news-block-list]");
    if (!list || !labels[type]) return;

    state.blockSequence += 1;
    const block = createElement("section", "admin-news-block");
    block.dataset.newsBlock = String(state.blockSequence);
    block.dataset.blockType = type;
    block.dataset.blockLabel = labels[type];

    const header = createElement("div", "admin-news-block-header");
    const title = createElement("h3", "", labels[type]);
    title.dataset.blockTitle = "";
    const actions = createElement("div", "admin-news-block-actions");
    const up = createButton("↑", "admin-block-icon-button");
    const down = createButton("↓", "admin-block-icon-button");
    const remove = createButton("Excluir", "admin-button admin-button-danger");
    up.dataset.blockUp = "";
    down.dataset.blockDown = "";
    up.setAttribute("aria-label", "Mover bloco para cima");
    down.setAttribute("aria-label", "Mover bloco para baixo");
    actions.append(up, down, remove);
    header.append(title, actions);
    block.appendChild(header);

    if (type === "paragrafo") {
      const field = createElement("label", "admin-field");
      field.appendChild(createElement("span", "", "Texto do parágrafo"));
      const textarea = createElement("textarea");
      textarea.rows = 6;
      field.appendChild(textarea);
      block.appendChild(field);
    } else if (type === "imagem") {
      block.appendChild(createNewsImageItem(page, elements, "Imagem"));
    } else if (type === "duas_imagens") {
      const grid = createElement("div", "admin-two-image-grid");
      grid.append(
        createNewsImageItem(page, elements, "Imagem 1"),
        createNewsImageItem(page, elements, "Imagem 2"),
      );
      block.appendChild(grid);
    } else if (type === "galeria") {
      const images = createElement("div", "admin-gallery-items");
      const addImage = createButton("+ Adicionar imagem");
      addImage.addEventListener("click", () => {
        images.appendChild(createNewsImageItem(page, elements, `Imagem ${images.children.length + 1}`, true));
        notifyPreview(page);
      });
      images.appendChild(createNewsImageItem(page, elements, "Imagem 1", true));
      block.append(images, addImage);
    } else if (type === "citacao") {
      const quoteField = createElement("label", "admin-field");
      quoteField.appendChild(createElement("span", "", "Citação"));
      const textarea = createElement("textarea");
      textarea.dataset.quoteText = "";
      quoteField.appendChild(textarea);
      const sourceField = createElement("label", "admin-field");
      sourceField.appendChild(createElement("span", "", "Autor / fonte (opcional)"));
      const source = createElement("input");
      source.type = "text";
      source.dataset.quoteSource = "";
      sourceField.appendChild(source);
      block.append(quoteField, sourceField);
    } else if (type === "tabela") {
      createTableEditor(block, page);
    }

    up.addEventListener("click", () => {
      const previous = block.previousElementSibling;
      if (previous) list.insertBefore(block, previous);
      updateBlockControls(list);
      notifyPreview(page);
    });
    down.addEventListener("click", () => {
      const next = block.nextElementSibling;
      if (next) list.insertBefore(next, block);
      updateBlockControls(list);
      notifyPreview(page);
    });
    remove.addEventListener("click", () => {
      cleanupBlockPreviews(block);
      block.remove();
      updateBlockControls(list);
      notifyPreview(page);
    });

    list.appendChild(block);
    updateBlockControls(list);
    notifyPreview(page);
  };

  const setupNewsBlockEditor = (page, elements) => {
    page.querySelectorAll("[data-add-news-block]").forEach((button) => {
      button.addEventListener("click", () => createNewsBlock(button.dataset.addNewsBlock, page, elements));
    });
  };

  const handleFile = (file, kind, page, config, elements) => {
    if (!file) return;
    const allowed = kind === "imagem" ? IMAGE_EXTENSIONS : PDF_EXTENSIONS;
    const extension = getFileExtension(file.name);
    const input = page.querySelector(`[data-file-input="${kind}"]`);
    const feedback = page.querySelector(`[data-file-feedback="${kind}"]`);

    if (!allowed.includes(extension)) {
      state.files[kind] = null;
      if (input) {
        input.value = "";
        input.dataset.storagePath = "";
      }
      if (kind === "imagem") {
        if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
        state.imagePreviewUrl = "";
        const preview = page.querySelector("[data-image-preview]");
        if (preview) {
          preview.hidden = true;
          preview.removeAttribute("src");
        }
      } else {
        limparPdfTcc();
      }
      if (feedback) feedback.textContent = "";
      setStatus(elements.formStatus, kind === "imagem"
        ? "Imagem inválida. Use JPG, PNG ou WEBP."
        : "PDF inválido. Use um arquivo .pdf.", "error");
      notifyPreview(page);
      return;
    }

    if (kind === "pdf" && config.requiresPdf && !definirPdfTcc(file)) {
      state.files.pdf = null;
      setStatus(elements.formStatus, "Selecione um PDF válido de até 10 MB.", "error");
      return;
    }

    state.files[kind] = file;
    if (input) input.dataset.storagePath = "";

    if (kind === "imagem") {
      if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
      state.imagePreviewUrl = URL.createObjectURL(file);
      const preview = page.querySelector("[data-image-preview]");
      if (preview) {
        preview.src = state.imagePreviewUrl;
        preview.hidden = false;
      }
    }

    if (feedback) {
      feedback.textContent = `${file.name} (${formatBytes(file.size)}) — será enviado ao Supabase Storage ao salvar`;
    }
    setStatus(elements.formStatus, "Arquivo selecionado e pronto para envio.", "success");
    notifyPreview(page);
  };

  const setupFileDrop = (page, config, elements) => {
    page.querySelectorAll("[data-file-drop]").forEach((zone) => {
      const kind = zone.dataset.fileDrop;
      const input = zone.querySelector(`[data-file-input="${kind}"]`);
      const trigger = zone.querySelector(`[data-file-trigger="${kind}"]`);
      trigger?.addEventListener("click", () => input?.click());
      input?.addEventListener("change", () => handleFile(input.files[0], kind, page, config, elements));

      ["dragenter", "dragover"].forEach((eventName) => {
        zone.addEventListener(eventName, (event) => {
          event.preventDefault();
          zone.classList.add("is-dragging");
        });
      });
      ["dragleave", "drop"].forEach((eventName) => {
        zone.addEventListener(eventName, (event) => {
          event.preventDefault();
          zone.classList.remove("is-dragging");
        });
      });
      zone.addEventListener("drop", (event) => {
        const file = event.dataTransfer?.files?.[0] || null;
        if (file && input && typeof DataTransfer === "function") {
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
        }
        handleFile(file, kind, page, config, elements);
      });
    });
  };

  const createUniqueSuffix = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const buildImageStoragePath = (file, folder, title, label) => {
    const extension = getFileExtension(file.name) || ".jpg";
    const titleSlug = slugify(title) || "conteudo";
    const labelSlug = slugify(label) || "imagem";
    return `${folder}/${titleSlug}-${labelSlug}-${createUniqueSuffix()}${extension}`;
  };

  const uploadImage = async (file, storagePath) => {
    const { data, error } = await supabase.storage
      .from(SITE_IMAGE_BUCKET)
      .upload(storagePath, file, { cacheControl: "3600", upsert: false });

    if (error) throw new Error(`Falha no upload de ${file.name}: ${error.message}`);
    return data.path;
  };

  const uploadSelectedImages = async (page, config, title, elements) => {
    const coverInput = page.querySelector('[data-file-input="imagem"]');
    if (state.files.imagem && coverInput && !coverInput.dataset.storagePath) {
      setStatus(elements.formStatus, "Enviando imagem de capa...");
      const path = buildImageStoragePath(state.files.imagem, config.imageFolder, title, "capa");
      coverInput.dataset.storagePath = await uploadImage(state.files.imagem, path);
    }

    if (config.tipo !== "noticia") return;

    const blockInputs = Array.from(page.querySelectorAll("[data-news-image-input]"));
    for (let index = 0; index < blockInputs.length; index += 1) {
      const input = blockInputs[index];
      const file = input.files[0];
      if (!file || input.dataset.storagePath) continue;
      setStatus(elements.formStatus, `Enviando imagem ${index + 1} do corpo da notícia...`);
      const path = buildImageStoragePath(file, config.imageFolder, title, `bloco-${index + 1}`);
      input.dataset.storagePath = await uploadImage(file, path);
    }
  };

  const resetFileState = (page) => {
    if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
    state.imagePreviewUrl = "";
    state.files.imagem = null;
    state.files.pdf = null;
    limparPdfTcc();

    page.querySelectorAll("[data-file-input]").forEach((input) => {
      input.value = "";
      input.dataset.storagePath = "";
    });
    page.querySelectorAll("[data-file-feedback]").forEach((element) => {
      element.textContent = "";
    });
    const imagePreview = page.querySelector("[data-image-preview]");
    if (imagePreview) {
      imagePreview.hidden = true;
      imagePreview.removeAttribute("src");
    }
  };

  const clearForm = (page, config, elements) => {
    elements.form?.reset();
    clearRepeatLists(page);
    resetFileState(page);
    const blockList = page.querySelector("[data-news-block-list]");
    if (blockList) {
      cleanupBlockPreviews(blockList);
      blockList.replaceChildren();
    }
    state.blockSequence = 0;
    renderCurrentPreview(page, config, elements);
    setStatus(elements.formStatus, "Formulário limpo.", "success");
  };

  const saveToSupabase = async (page, config, elements) => {
    const previewItem = buildContentObject(page, config, true);
    const validation = validateContent(previewItem, config);
    if (validation.errors.length) {
      setStatus(elements.formStatus, validation.errors.join(" "), "error");
      return;
    }

    elements.saveButton.disabled = true;
    try {
      await uploadSelectedImages(page, config, previewItem.titulo, elements);
      const item = buildContentObject(page, config, false);

      if (config.requiresPdf && !item.pdf) {
        setStatus(elements.formStatus, `Enviando PDF do ${config.saveLabel}...`);
        const pdfUpload = await uploadPdfTcc(item.titulo, config.storagePdfFolder);
        item.pdf = pdfUpload.publicUrl;
        item.pdfStoragePath = pdfUpload.path;
        const pdfInput = page.querySelector('[data-file-input="pdf"]');
        if (pdfInput) pdfInput.dataset.storagePath = pdfUpload.publicUrl;
      }

      setStatus(elements.formStatus, `Salvando ${config.saveLabel} no Supabase...`);
      await salvarConteudo(item);
      const warning = validation.warnings.length ? ` ${validation.warnings.join(" ")}` : "";
      const successLabel = config.tipo === "noticia"
        ? "Notícia salva"
        : config.tipo === "artigo"
          ? "Artigo salvo"
          : "TCC salvo";
      setStatus(elements.formStatus, `${successLabel} no Supabase com sucesso.${warning}`, validation.warnings.length ? "warning" : "success");
      renderCurrentPreview(page, config, elements);
    } catch (error) {
      const message = error?.message || "Erro desconhecido.";
      console.error("Erro ao salvar no Supabase:", error);
      setStatus(elements.formStatus, `Não foi possível salvar ${config.saveLabel}: ${message}`, "error");
    } finally {
      elements.saveButton.disabled = false;
    }
  };

  const initPage = () => {
    const page = document.querySelector("[data-admin-form-page]");
    if (!page) return;

    const config = getConfig(page);
    const elements = {
      form: page.querySelector("#admin-content-form"),
      saveButton: page.querySelector("#admin-form-save-supabase"),
      clearButton: page.querySelector("#admin-form-clear"),
      formStatus: page.querySelector("#admin-form-status"),
      contentPreview: page.querySelector("#admin-content-preview"),
    };

    setupRepeatLists(page);
    setupFileDrop(page, config, elements);
    if (config.tipo === "noticia") setupNewsBlockEditor(page, elements);

    let previewFrame = 0;
    const schedulePreview = () => {
      cancelAnimationFrame(previewFrame);
      previewFrame = requestAnimationFrame(() => renderCurrentPreview(page, config, elements));
    };
    page.addEventListener("admin:preview-change", schedulePreview);
    elements.form?.addEventListener("input", schedulePreview);
    elements.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveToSupabase(page, config, elements);
    });
    elements.clearButton?.addEventListener("click", () => clearForm(page, config, elements));

    renderCurrentPreview(page, config, elements);
  };

  document.addEventListener("DOMContentLoaded", initPage);
})();
