import { salvarConteudo } from "./admin-conteudos.js";
import { definirPdfTcc, limparPdfTcc, uploadPdfTcc } from "./admin-tccs.js";

(() => {
  const CONFIGS = {
    noticias: {
      tipo: "noticia",
      prefix: "noticia",
      storageKey: "admin_noticias",
      imageFolder: "noticias",
      requiresAuthor: false,
      requiresPdf: false,
      requiresYear: false,
      requiresDate: true,
      sample: {
        id: "noticia-exemplo",
        tipo: "noticia",
        titulo: "T\u00edtulo da not\u00edcia",
        descricaoCurta: "Resumo curto",
        descricaoLonga: "Texto completo da not\u00edcia",
        imagem: "/assets/img/noticias/nome-da-imagem.jpg",
        data: "2026-06-22",
        autores: ["Autor 1"],
        palavrasChave: ["palavra1", "palavra2"],
      },
    },
    artigos: {
      tipo: "artigo",
      prefix: "artigo",
      storageKey: "admin_artigos",
      imageFolder: "artigos",
      pdfFolder: "ARTIGOS",
      storagePdfFolder: "artigos",
      requiresAuthor: true,
      requiresPdf: true,
      requiresYear: true,
      requiresDate: false,
      sample: {
        id: "artigo-exemplo",
        tipo: "artigo",
        titulo: "T\u00edtulo do artigo",
        descricaoCurta: "Resumo curto",
        descricaoLonga: "Resumo longo",
        imagem: "/assets/img/artigos/nome-da-imagem.jpg",
        pdf: "/assets/data/files-pdf/ARTIGOS/nome-do-arquivo.pdf",
        autores: ["Autor 1", "Autor 2"],
        palavrasChave: ["palavra1", "palavra2"],
        ano: 2026,
      },
    },
    tccs: {
      tipo: "tcc",
      prefix: "tcc",
      storageKey: "admin_tccs",
      imageFolder: "tcc",
      pdfFolder: "TCC",
      storagePdfFolder: "tccs",
      requiresAuthor: true,
      requiresPdf: true,
      requiresYear: true,
      requiresDate: false,
      sample: {
        id: "tcc-exemplo",
        tipo: "tcc",
        titulo: "T\u00edtulo do TCC",
        descricaoCurta: "Resumo curto",
        descricaoLonga: "Resumo longo",
        imagem: "/assets/img/tcc/nome-da-imagem.jpg",
        pdf: "/assets/data/files-pdf/TCC/nome-do-arquivo.pdf",
        autores: ["Autor 1", "Autor 2"],
        orientador: "Nome do orientador",
        palavrasChave: ["palavra1", "palavra2"],
        ano: 2026,
        curso: "Engenharia de Controle e Automa\u00e7\u00e3o",
      },
    },
  };

  const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
  const PDF_EXTENSIONS = [".pdf"];

  const state = {
    generatedJson: null,
    files: {
      imagem: null,
      pdf: null,
    },
    imagePreviewUrl: "",
  };

  const getConfig = (page) => {
    const type = page.dataset.adminContentType || "noticias";
    const config = CONFIGS[type] || CONFIGS.noticias;

    return {
      ...config,
      storageKey: page.dataset.adminStorageKey || config.storageKey,
    };
  };

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

  const sanitizeFileName = (fileName) => {
    const extension = getFileExtension(fileName);
    const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
    return `${slugify(baseName) || "arquivo"}${extension}`;
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getExpectedFilePath = (file, kind, config) => {
    if (!file) return "";

    const fileName = sanitizeFileName(file.name);

    if (kind === "imagem") {
      return `/assets/img/${config.imageFolder}/${fileName}`;
    }

    return `/assets/data/files-pdf/${config.pdfFolder}/${fileName}`;
  };

  const getStorageItems = (storageKey) => {
    try {
      const value = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  };

  const saveStorageItem = (storageKey, item) => {
    const items = getStorageItems(storageKey);
    items.push(item);
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    return items;
  };

  const setStorageItems = (storageKey, items) => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
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

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
  };

  const addRepeatItem = (control, value) => {
    const text = String(value || "").trim();
    if (!text) return;

    const items = control.querySelector("[data-repeat-items]");
    if (!items) return;

    const chip = createElement("span", "admin-repeat-chip");
    chip.dataset.repeatValue = text;
    chip.appendChild(document.createTextNode(text));

    const remove = createElement("button", "", "\u00d7");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remover ${text}`);
    remove.addEventListener("click", () => chip.remove());

    chip.appendChild(remove);
    items.appendChild(chip);
  };

  const setupRepeatLists = (page) => {
    page.querySelectorAll("[data-repeat-list]").forEach((control) => {
      const input = control.querySelector("[data-repeat-input]");
      const addButton = control.querySelector("[data-repeat-add]");

      const addCurrentValue = () => {
        if (!input) return;
        addRepeatItem(control, input.value);
        input.value = "";
        input.focus();
      };

      if (addButton) {
        addButton.addEventListener("click", addCurrentValue);
      }

      if (input) {
        input.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          addCurrentValue();
        });
      }
    });
  };

  const getRepeatValues = (page, name) => {
    const control = page.querySelector(`[data-repeat-list="${name}"]`);
    if (!control) return [];

    const chipValues = Array.from(control.querySelectorAll("[data-repeat-value]"))
      .map((item) => item.dataset.repeatValue.trim())
      .filter(Boolean);
    const input = control.querySelector("[data-repeat-input]");
    const pendingValue = input ? input.value.trim() : "";

    return [...chipValues, pendingValue].filter(Boolean);
  };

  const clearRepeatLists = (page) => {
    page.querySelectorAll("[data-repeat-list]").forEach((control) => {
      const items = control.querySelector("[data-repeat-items]");
      const input = control.querySelector("[data-repeat-input]");
      if (items) items.innerHTML = "";
      if (input) input.value = "";
    });
  };

  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day;
  };

  const isNumericYear = (value) => /^\d{4}$/.test(String(value || "").trim());

  const validateContent = (item, config) => {
    const errors = [];
    const warnings = [];

    if (!item.titulo) errors.push("Informe o t\u00edtulo.");
    if (!item.descricaoCurta) errors.push("Informe a descri\u00e7\u00e3o curta.");

    if (config.requiresAuthor && (!Array.isArray(item.autores) || !item.autores.length)) {
      errors.push("Adicione ao menos um autor.");
    }

    if (config.requiresYear && !isNumericYear(item.ano)) {
      errors.push("Informe um ano num\u00e9rico com 4 d\u00edgitos.");
    }

    if (config.requiresDate && !isValidDate(item.data)) {
      errors.push("Informe uma data v\u00e1lida.");
    }

    if (config.requiresPdf && !item.pdf) {
      errors.push("Selecione um PDF.");
    }

    if (!item.imagem) {
      warnings.push("Imagem n\u00e3o selecionada. Ela \u00e9 opcional, mas recomendada.");
    }

    return { errors, warnings };
  };

  const buildContentObject = (page, config) => {
    const title = getFieldValue(page, "titulo");
    const authors = getRepeatValues(page, "autores");
    const keywords = getRepeatValues(page, "palavrasChave");
    const imagePath = getExpectedFilePath(state.files.imagem, "imagem", config);

    if (config.tipo === "noticia") {
      return {
        id: generateId(title, config),
        tipo: config.tipo,
        titulo: title,
        descricaoCurta: getFieldValue(page, "descricaoCurta"),
        descricaoLonga: getFieldValue(page, "descricaoLonga"),
        imagem: imagePath,
        data: getFieldValue(page, "data"),
        autores: authors,
        palavrasChave: keywords,
      };
    }

    const pdfPath = getExpectedFilePath(state.files.pdf, "pdf", config);
    const year = getFieldValue(page, "ano");
    const item = {
      id: generateId(title, config),
      tipo: config.tipo,
      titulo: title,
      descricaoCurta: getFieldValue(page, "descricaoCurta"),
      descricaoLonga: getFieldValue(page, "descricaoLonga"),
      imagem: imagePath,
      pdf: pdfPath,
      autores: authors,
      palavrasChave: keywords,
      ano: isNumericYear(year) ? Number(year) : year,
    };

    if (config.tipo === "tcc") {
      item.orientador = getFieldValue(page, "orientador");
      item.curso = getFieldValue(page, "curso");
    }

    return item;
  };

  const renderJson = (element, item) => {
    if (!element) return;
    element.textContent = item ? JSON.stringify(item, null, 2) : "";
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

  const renderFriendlyPreview = (container, item, imagePreviewSrc = "") => {
    if (!container) return;
    container.innerHTML = "";

    if (!item) {
      container.appendChild(createElement("p", "admin-empty", "Gere um JSON para visualizar o conte\u00fado."));
      return;
    }

    const title = createElement("h3", "", item.titulo || "Sem t\u00edtulo");
    const description = createElement("p", "admin-preview-description", item.descricaoCurta || "Sem descri\u00e7\u00e3o curta.");
    const list = createElement("dl", "admin-preview-list");

    addPreviewLine(list, "Tipo", item.tipo);
    addPreviewLine(list, "ID", item.id);
    addPreviewLine(list, "Autores", Array.isArray(item.autores) ? item.autores.join(", ") : "");
    addPreviewLine(list, "Palavras-chave", Array.isArray(item.palavrasChave) ? item.palavrasChave.join(", ") : "");
    addPreviewLine(list, "Ano/Data", item.ano || item.data || "");
    addPreviewLine(list, "Orientador", item.orientador || "");
    addPreviewLine(list, "Curso", item.curso || "");
    addPreviewLine(list, "Imagem", item.imagem || "");
    addPreviewLine(list, "PDF", item.pdf || "", true);

    container.append(title, description, list);

    if (imagePreviewSrc) {
      const image = createElement("img", "admin-preview-image");
      image.src = imagePreviewSrc;
      image.alt = item.titulo || "Pr\u00e9via da imagem";
      container.appendChild(image);
    }
  };

  const generateContent = (page, config, elements, showSuccess = true) => {
    const item = buildContentObject(page, config);
    const validation = validateContent(item, config);

    if (validation.errors.length) {
      state.generatedJson = null;
      renderJson(elements.jsonPreview, null);
      renderFriendlyPreview(elements.contentPreview, null);
      setStatus(elements.formStatus, validation.errors.join(" "), "error");
      return null;
    }

    state.generatedJson = item;
    renderJson(elements.jsonPreview, item);
    renderFriendlyPreview(elements.contentPreview, item, state.imagePreviewUrl);

    if (showSuccess) {
      const warning = validation.warnings.length ? ` ${validation.warnings.join(" ")}` : "";
      setStatus(elements.formStatus, `JSON gerado com sucesso.${warning}`, validation.warnings.length ? "warning" : "success");
    }

    return item;
  };

  const parseManualJson = (input) => {
    const raw = input ? input.value.trim() : "";

    if (!raw) {
      throw new Error("Cole um JSON antes de validar.");
    }

    const parsed = JSON.parse(raw);

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("O JSON precisa ser um objeto.");
    }

    return parsed;
  };

  const copyText = async (text) => {
    if (!text) {
      throw new Error("Nenhum JSON gerado para copiar.");
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.left = "-9999px";
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  };

  const resetFileState = (page) => {
    if (state.imagePreviewUrl) {
      URL.revokeObjectURL(state.imagePreviewUrl);
    }

    state.files.imagem = null;
    state.files.pdf = null;
    state.imagePreviewUrl = "";
    limparPdfTcc();

    page.querySelectorAll("[data-file-input]").forEach((input) => {
      input.value = "";
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

  const clearForm = (page, elements) => {
    const form = page.querySelector("#admin-content-form");
    if (form) form.reset();

    clearRepeatLists(page);
    resetFileState(page);
    state.generatedJson = null;
    renderJson(elements.jsonPreview, null);
    renderFriendlyPreview(elements.contentPreview, null);
    setStatus(elements.formStatus, "Formul\u00e1rio limpo.", "success");
  };

  const handleFile = (file, kind, page, config, elements) => {
    if (!file) return;

    const allowed = kind === "imagem" ? IMAGE_EXTENSIONS : PDF_EXTENSIONS;
    const extension = getFileExtension(file.name);
    const feedback = page.querySelector(`[data-file-feedback="${kind}"]`);

    if (!allowed.includes(extension)) {
      setStatus(elements.formStatus, kind === "imagem"
        ? "Imagem inv\u00e1lida. Use JPG, PNG ou WEBP."
        : "PDF inv\u00e1lido. Use um arquivo .pdf.", "error");
      return;
    }

    if (kind === "pdf" && config.requiresPdf && !definirPdfTcc(file)) {
      state.files.pdf = null;
      setStatus(elements.formStatus, "Selecione um PDF valido de ate 10 MB.", "error");
      return;
    }

    // TODO: futuramente substituir este comportamento por upload real usando Node.js/Supabase Storage.
    state.files[kind] = file;

    if (kind === "imagem") {
      if (state.imagePreviewUrl) {
        URL.revokeObjectURL(state.imagePreviewUrl);
      }

      state.imagePreviewUrl = URL.createObjectURL(file);

      const preview = page.querySelector("[data-image-preview]");
      if (preview) {
        preview.src = state.imagePreviewUrl;
        preview.hidden = false;
      }
    }

    if (feedback) {
      const path = getExpectedFilePath(file, kind, config);
      feedback.textContent = kind === "pdf" && config.requiresPdf
        ? `${file.name} (${formatBytes(file.size)}) - sera enviado ao Supabase Storage ao salvar`
        : kind === "pdf"
        ? `${file.name} (${formatBytes(file.size)}) -> ${path}`
        : `${file.name} -> ${path}`;
    }

    setStatus(elements.formStatus, kind === "pdf" && config.requiresPdf
      ? "PDF selecionado. Ele sera enviado ao Supabase Storage ao salvar."
      : "Arquivo selecionado. O upload real ainda n\u00e3o foi implementado.", "warning");
  };

  const setupFileDrop = (page, config, elements) => {
    page.querySelectorAll("[data-file-drop]").forEach((zone) => {
      const kind = zone.dataset.fileDrop;
      const input = zone.querySelector(`[data-file-input="${kind}"]`);
      const trigger = zone.querySelector(`[data-file-trigger="${kind}"]`);

      if (trigger && input) {
        trigger.addEventListener("click", () => input.click());
      }

      if (input) {
        input.addEventListener("change", () => {
          handleFile(input.files[0], kind, page, config, elements);
        });
      }

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
        const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
        handleFile(file, kind, page, config, elements);
      });
    });
  };

  const getSummaryDate = (item) => item.ano || item.data || "Sem ano/data";

  const renderSavedItems = (page, config, elements) => {
    const list = elements.savedList;
    if (!list) return;

    const items = getStorageItems(config.storageKey);
    list.innerHTML = "";

    if (!items.length) {
      list.appendChild(createElement("p", "admin-empty", `Nenhum item salvo em ${config.storageKey}.`));
      return;
    }

    items.forEach((item, index) => {
      const card = createElement("article", "admin-saved-card");
      const title = createElement("h3", "", item.titulo || `Item ${index + 1}`);
      const meta = createElement("p", "", `${item.tipo || config.tipo} | ${getSummaryDate(item)}`);
      const authors = createElement("p", "", Array.isArray(item.autores) && item.autores.length
        ? `Autores: ${item.autores.join(", ")}`
        : "Autores: n\u00e3o informados");
      const actions = createElement("div", "admin-saved-actions");

      const viewButton = createElement("button", "admin-button admin-button-secondary", "Visualizar JSON");
      viewButton.type = "button";
      viewButton.addEventListener("click", () => {
        state.generatedJson = item;
        renderJson(elements.jsonPreview, item);
        renderFriendlyPreview(elements.contentPreview, item);
        setStatus(elements.formStatus, "JSON carregado na pr\u00e9-visualiza\u00e7\u00e3o.", "success");
      });

      const deleteButton = createElement("button", "admin-button admin-button-danger", "Excluir");
      deleteButton.type = "button";
      deleteButton.addEventListener("click", () => {
        const currentItems = getStorageItems(config.storageKey);
        currentItems.splice(index, 1);
        setStorageItems(config.storageKey, currentItems);
        renderSavedItems(page, config, elements);
        setStatus(elements.formStatus, "Item removido do localStorage.", "success");
      });

      actions.append(viewButton, deleteButton);
      card.append(title, meta, authors, actions);
      list.appendChild(card);
    });
  };

  const setupManualMode = (page, config, elements) => {
    const input = elements.manualInput;

    if (input) {
      input.placeholder = JSON.stringify(config.sample, null, 2);
    }

    if (elements.manualValidate) {
      elements.manualValidate.addEventListener("click", () => {
        try {
          const item = parseManualJson(input);
          renderJson(elements.manualPreview, item);
          setStatus(elements.manualStatus, "JSON v\u00e1lido.", "success");
        } catch (error) {
          renderJson(elements.manualPreview, null);
          setStatus(elements.manualStatus, `JSON inv\u00e1lido: ${error.message}`, "error");
        }
      });
    }

    if (elements.manualSave) {
      elements.manualSave.addEventListener("click", () => {
        try {
          const item = parseManualJson(input);
          const validation = validateContent(item, config);

          if (validation.errors.length) {
            throw new Error(validation.errors.join(" "));
          }

          saveStorageItem(config.storageKey, item);
          renderJson(elements.manualPreview, item);
          renderSavedItems(page, config, elements);
          setStatus(elements.manualStatus, `JSON salvo temporariamente em ${config.storageKey}.`, "success");
          // TODO: enviar JSON para rota POST protegida no backend.
          // TODO: salvar dados no Supabase.
          // TODO: implementar upload real de PDFs.
          // TODO: validar estrutura semantica de cada tipo de conteudo.
        } catch (error) {
          setStatus(elements.manualStatus, `N\u00e3o foi poss\u00edvel salvar: ${error.message}`, "error");
        }
      });
    }

    if (elements.manualClear) {
      elements.manualClear.addEventListener("click", () => {
        if (input) input.value = "";
        renderJson(elements.manualPreview, null);
        setStatus(elements.manualStatus, "");
      });
    }
  };

  const getElements = (page) => ({
    form: page.querySelector("#admin-content-form"),
    generateButton: page.querySelector("#admin-form-generate"),
    saveButton: page.querySelector("#admin-form-save"),
    supabaseButton: page.querySelector("#admin-form-save-supabase"),
    copyButton: page.querySelector("#admin-form-copy"),
    clearButton: page.querySelector("#admin-form-clear"),
    formStatus: page.querySelector("#admin-form-status"),
    contentPreview: page.querySelector("#admin-content-preview"),
    jsonPreview: page.querySelector("#admin-json-preview"),
    savedList: page.querySelector("#admin-saved-list"),
    manualInput: page.querySelector("#admin-manual-json"),
    manualValidate: page.querySelector("#admin-manual-validate"),
    manualSave: page.querySelector("#admin-manual-save"),
    manualClear: page.querySelector("#admin-manual-clear"),
    manualStatus: page.querySelector("#admin-manual-status"),
    manualPreview: page.querySelector("#admin-manual-preview"),
  });

  const initPage = () => {
    const page = document.querySelector("[data-admin-form-page]");
    if (!page) return;

    const config = getConfig(page);
    const elements = getElements(page);

    setupRepeatLists(page);
    setupFileDrop(page, config, elements);
    setupManualMode(page, config, elements);
    renderFriendlyPreview(elements.contentPreview, null);
    renderSavedItems(page, config, elements);

    if (elements.form) {
      elements.form.addEventListener("submit", (event) => {
        event.preventDefault();
        generateContent(page, config, elements);
      });
    }

    if (elements.generateButton) {
      elements.generateButton.addEventListener("click", () => {
        generateContent(page, config, elements);
      });
    }

    if (elements.saveButton) {
      elements.saveButton.addEventListener("click", () => {
        const item = generateContent(page, config, elements, false);

        if (!item) return;

        saveStorageItem(config.storageKey, item);
        renderSavedItems(page, config, elements);
        setStatus(elements.formStatus, `Conte\u00fado salvo temporariamente em ${config.storageKey}.`, "success");
        // TODO: enviar JSON para rota POST protegida no backend.
        // TODO: salvar dados no Supabase.
        // TODO: implementar upload real de PDFs.
        // TODO: validar estrutura semantica de cada tipo de conteudo.
      });
    }

    if (elements.supabaseButton) {
      elements.supabaseButton.addEventListener("click", async () => {
        const item = generateContent(page, config, elements, false);

        if (!item) return;

        elements.supabaseButton.disabled = true;
        setStatus(elements.formStatus, "Salvando no Supabase...");

        try {
          if (config.requiresPdf) {
            const contentLabel = config.tipo === "tcc" ? "TCC" : "artigo";
            setStatus(elements.formStatus, `Enviando PDF do ${contentLabel}...`);
            const pdfUpload = await uploadPdfTcc(item.titulo, config.storagePdfFolder);
            item.pdf = pdfUpload.publicUrl;
            item.pdfStoragePath = pdfUpload.path;
            state.generatedJson = item;
            renderJson(elements.jsonPreview, item);
            renderFriendlyPreview(elements.contentPreview, item, state.imagePreviewUrl);
            setStatus(elements.formStatus, `PDF enviado. Salvando ${contentLabel} no Supabase...`);
          }

          await salvarConteudo(item);
          setStatus(elements.formStatus, "Conte\u00fado salvo no Supabase com sucesso.", "success");
        } catch (error) {
          const message = error && error.message ? error.message : "Erro desconhecido.";
          console.error("Erro ao salvar no Supabase:", error);
          setStatus(elements.formStatus, config.requiresPdf
            ? `Erro ao enviar o PDF ou salvar o conte\u00fado: ${message}`
            : `Erro ao salvar no Supabase: ${message}`, "error");
        } finally {
          elements.supabaseButton.disabled = false;
        }
      });
    }

    if (elements.copyButton) {
      elements.copyButton.addEventListener("click", async () => {
        try {
          const text = elements.jsonPreview ? elements.jsonPreview.textContent.trim() : "";
          await copyText(text);
          setStatus(elements.formStatus, "JSON copiado.", "success");
        } catch (error) {
          setStatus(elements.formStatus, error.message, "error");
        }
      });
    }

    if (elements.clearButton) {
      elements.clearButton.addEventListener("click", () => {
        clearForm(page, elements);
      });
    }
  };

  window.LigaAdminForm = {
    slugify,
    generateId,
    addRepeatItem,
    getRepeatValues,
    getExpectedFilePath,
    buildContentObject,
    validateContent,
    saveStorageItem,
    getStorageItems,
    renderSavedItems,
    clearForm,
  };

  document.addEventListener("DOMContentLoaded", initPage);
})();
