(() => {
  const CONFIGS = {
    noticias: {
      labelSingular: "noticia",
      labelPlural: "noticias",
      storageKey: "admin_noticias",
      sample: {
        titulo: "T\u00edtulo da not\u00edcia",
        descricaoCurta: "Resumo curto da not\u00edcia.",
        descricaoLonga: "Texto completo ou descri\u00e7\u00e3o longa da not\u00edcia.",
        autores: ["Nome do autor"],
        palavrasChave: ["sa\u00fade", "gest\u00e3o"],
        pdf: "/assets/data/files-pdf/exemplo.pdf",
        imagem: "/assets/data/img/logo.png",
        ano: 2026,
        tipo: "noticia",
      },
    },
    artigos: {
      labelSingular: "artigo",
      labelPlural: "artigos",
      storageKey: "admin_artigos",
      sample: {
        titulo: "T\u00edtulo do artigo",
        descricaoCurta: "Resumo curto do artigo.",
        descricaoLonga: "Resumo expandido ou observa\u00e7\u00f5es do artigo.",
        autores: ["Nome do autor"],
        palavrasChave: ["sa\u00fade p\u00fablica", "gest\u00e3o"],
        pdf: "/assets/data/files-pdf/ARTIGOS/ano/arquivo.pdf",
        ano: 2026,
        tipo: "artigo",
      },
    },
    tccs: {
      labelSingular: "TCC",
      labelPlural: "TCCs",
      storageKey: "admin_tccs",
      sample: {
        titulo: "T\u00edtulo do TCC",
        descricaoCurta: "Resumo curto do TCC.",
        descricaoLonga: "Resumo expandido ou observa\u00e7\u00f5es do TCC.",
        autores: ["Nome do autor"],
        palavrasChave: ["SUS", "avaliacao"],
        pdf: "/assets/data/files-pdf/TCC/arquivo.pdf",
        ano: "2026",
        tipo: "tcc",
      },
    },
  };

  const getConfig = (page) => {
    const type = page.dataset.adminContentType || "noticias";
    const config = CONFIGS[type] || CONFIGS.noticias;

    return {
      ...config,
      storageKey: page.dataset.adminStorageKey || config.storageKey,
    };
  };

  const parseJsonObject = (raw) => {
    const parsed = JSON.parse(raw);

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("O JSON precisa ser um objeto.");
    }

    return parsed;
  };

  const getSavedItems = (storageKey) => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  };

  const saveItem = (storageKey, item) => {
    const items = getSavedItems(storageKey);
    items.push(item);
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    return items;
  };

  const getFirstValue = (item, keys) => {
    for (const key of keys) {
      const value = item[key];

      if (Array.isArray(value) && value.length) {
        return value.join(", ");
      }

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (typeof value === "number") {
        return String(value);
      }
    }

    return "";
  };

  const setStatus = (element, message, type = "") => {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", type === "error");
    element.classList.toggle("is-success", type === "success");
  };

  const renderFormattedJson = (element, item) => {
    if (!element) return;
    element.textContent = item ? JSON.stringify(item, null, 2) : "";
  };

  const addPreviewRow = (list, label, value, isLink = false) => {
    if (!value) return;

    const term = document.createElement("dt");
    term.textContent = label;

    const description = document.createElement("dd");

    if (isLink) {
      const link = document.createElement("a");
      link.href = value;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = value;
      description.appendChild(link);
    } else {
      description.textContent = value;
    }

    list.append(term, description);
  };

  const renderSemanticPreview = (element, item) => {
    if (!element) return;
    element.innerHTML = "";

    if (!item) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Nenhum JSON validado ainda.";
      element.appendChild(empty);
      return;
    }

    const title = getFirstValue(item, ["titulo", "title", "nome"]);
    const description = getFirstValue(item, ["descricaoCurta", "resumo", "descricao", "description"]);
    const authors = getFirstValue(item, ["autores", "authors", "autor"]);
    const keywords = getFirstValue(item, ["palavrasChave", "keywords", "tags"]);
    const pdf = getFirstValue(item, ["pdf", "linkPdf", "arquivoPdf"]);

    const heading = document.createElement("h3");
    heading.textContent = title || "Sem t\u00edtulo";

    const list = document.createElement("dl");
    list.className = "admin-preview-list";

    addPreviewRow(list, "Descri\u00e7\u00e3o curta", description);
    addPreviewRow(list, "Autores", authors);
    addPreviewRow(list, "Palavras-chave", keywords);
    addPreviewRow(list, "PDF", pdf, true);

    element.append(heading, list);
  };

  const renderSavedItems = (element, items, config) => {
    if (!element) return;
    element.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = `Nenhum item salvo em ${config.storageKey}.`;
      element.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "admin-saved-card";

      const title = document.createElement("h3");
      title.textContent = getFirstValue(item, ["titulo", "title", "nome"]) || `Item ${index + 1}`;

      const description = document.createElement("p");
      description.textContent = getFirstValue(item, ["descricaoCurta", "resumo", "descricao", "description"]) || "Sem descri\u00e7\u00e3o curta.";

      const meta = document.createElement("span");
      meta.textContent = `${config.labelSingular} #${index + 1}`;

      card.append(title, description, meta);
      element.appendChild(card);
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.querySelector("[data-admin-json-page]");
    if (!page) return;

    const config = getConfig(page);
    const input = document.getElementById("admin-json-input");
    const validateButton = document.getElementById("admin-json-validate");
    const saveButton = document.getElementById("admin-json-save");
    const clearButton = document.getElementById("admin-json-clear");
    const status = document.getElementById("admin-json-status");
    const formattedPreview = document.getElementById("admin-json-preview");
    const semanticPreview = document.getElementById("admin-content-preview");
    const savedList = document.getElementById("admin-saved-list");

    if (input) {
      input.placeholder = JSON.stringify(config.sample, null, 2);
    }

    renderSemanticPreview(semanticPreview, null);
    renderSavedItems(savedList, getSavedItems(config.storageKey), config);

    const validateCurrentJson = () => {
      if (!input) return null;
      const raw = input.value.trim();

      if (!raw) {
        throw new Error("Cole um JSON antes de validar.");
      }

      const parsed = parseJsonObject(raw);
      renderFormattedJson(formattedPreview, parsed);
      renderSemanticPreview(semanticPreview, parsed);
      return parsed;
    };

    if (validateButton) {
      validateButton.addEventListener("click", () => {
        try {
          validateCurrentJson();
          setStatus(status, "JSON v\u00e1lido.", "success");
        } catch (error) {
          renderFormattedJson(formattedPreview, null);
          renderSemanticPreview(semanticPreview, null);
          setStatus(status, `JSON inv\u00e1lido: ${error.message}`, "error");
        }
      });
    }

    if (saveButton) {
      saveButton.addEventListener("click", () => {
        try {
          const parsed = validateCurrentJson();
          const items = saveItem(config.storageKey, parsed);
          renderSavedItems(savedList, items, config);
          setStatus(status, `JSON salvo temporariamente em ${config.storageKey}.`, "success");
          // TODO: enviar JSON para rota POST protegida no backend.
          // TODO: salvar dados no Supabase.
          // TODO: implementar upload real de PDFs.
          // TODO: validar estrutura semantica de cada tipo de conteudo.
        } catch (error) {
          setStatus(status, `N\u00e3o foi poss\u00edvel salvar: ${error.message}`, "error");
        }
      });
    }

    if (clearButton && input) {
      clearButton.addEventListener("click", () => {
        input.value = "";
        renderFormattedJson(formattedPreview, null);
        renderSemanticPreview(semanticPreview, null);
        setStatus(status, "");
      });
    }
  });
})();
