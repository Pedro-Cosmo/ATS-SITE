import { supabase } from "./supabase-client.js";

const BUCKET = "site-images";
const FOLDER = "colaboradores";
const PLACEHOLDER = "/assets/data/img/membro-placeholder.png";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

let colaboradores = [];
let arquivoSelecionado = null;
let editId = null;
let previewUrl = "";

const onReady = (callback) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
    return;
  }

  callback();
};

const setStatus = (message, type = "") => {
  const status = document.getElementById("colaborador-status");
  if (!status) return;

  status.textContent = message;
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-success", type === "success");
};

const getPublicImageUrl = (path) => {
  if (!path) return PLACEHOLDER;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};

const gerarSlug = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const renderLista = () => {
  const container = document.getElementById("colaboradores-lista");
  if (!container) return;

  container.replaceChildren();
  if (!colaboradores.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = "Nenhum colaborador cadastrado.";
    container.appendChild(empty);
    return;
  }

  colaboradores.forEach((colaborador) => {
    const card = document.createElement("article");
    card.className = "admin-saved-card";

    const img = document.createElement("img");
    img.className = "admin-saved-thumb";
    img.alt = colaborador.nome ? `Foto de ${colaborador.nome}` : "Foto do colaborador";
    img.src = getPublicImageUrl(colaborador.imagem_path);
    img.onerror = () => {
      img.onerror = null;
      img.src = PLACEHOLDER;
    };

    const name = document.createElement("h3");
    name.textContent = colaborador.nome || "(sem nome)";

    const description = document.createElement("p");
    description.textContent = colaborador.descricao || "";

    const actions = document.createElement("div");
    actions.className = "admin-saved-actions";

    const editButton = document.createElement("button");
    editButton.className = "admin-button";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => iniciarEdicao(colaborador.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "admin-button admin-button-danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => excluirColaborador(colaborador));

    actions.append(editButton, deleteButton);
    card.append(img, name, description, actions);
    container.appendChild(card);
  });
};

const listarColaboradores = async () => {
  try {
    const { data, error } = await supabase
      .from("colaboradores")
      .select("id, nome, descricao, imagem_path")
      .order("nome", { ascending: true });
    if (error) throw error;

    colaboradores = Array.isArray(data) ? data : [];
    renderLista();
    setStatus("");
    return { success: true };
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    setStatus(`Erro ao listar colaboradores: ${error.message || error}`, "error");
    return { success: false, error };
  }
};

const showImagePreview = (url, feedback = "") => {
  const image = document.querySelector("[data-image-preview]");
  const fileFeedback = document.querySelector('[data-file-feedback="foto"]');
  if (image) {
    image.src = url;
    image.hidden = false;
  }
  if (fileFeedback) fileFeedback.textContent = feedback;
};

const clearPreviewUrl = () => {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = "";
};

const limparFormulario = () => {
  const form = document.getElementById("colaborador-form");
  if (!form) return;

  form.reset();
  arquivoSelecionado = null;
  editId = null;
  clearPreviewUrl();

  const image = document.querySelector("[data-image-preview]");
  if (image) {
    image.removeAttribute("src");
    image.hidden = true;
  }
  const feedback = document.querySelector('[data-file-feedback="foto"]');
  if (feedback) feedback.textContent = "";
  setStatus("");
};

const iniciarEdicao = (id) => {
  const colaborador = colaboradores.find((item) => item.id === id);
  const form = document.getElementById("colaborador-form");
  if (!colaborador || !form) return;

  limparFormulario();
  editId = id;
  form.querySelector('[data-field="nome"]').value = colaborador.nome || "";
  form.querySelector('[data-field="descricao"]').value = colaborador.descricao || "";

  if (colaborador.imagem_path) {
    showImagePreview(getPublicImageUrl(colaborador.imagem_path), colaborador.imagem_path);
  }
  setStatus(`Editando ${colaborador.nome || "colaborador"}.`);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const uploadFoto = async (nome) => {
  const extension = arquivoSelecionado.name.split(".").pop().toLowerCase();
  const filename = `${gerarSlug(nome) || "colaborador"}-${Date.now()}.${extension}`;
  const path = `${FOLDER}/${filename}`;
  const feedback = document.querySelector('[data-file-feedback="foto"]');
  if (feedback) feedback.textContent = "Enviando imagem...";

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, arquivoSelecionado, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  return data.path;
};

const salvarColaborador = async (event) => {
  event.preventDefault();
  const form = document.getElementById("colaborador-form");
  const saveButton = document.getElementById("colaborador-save");
  if (!form) return;

  const nome = form.querySelector('[data-field="nome"]').value.trim();
  const descricao = form.querySelector('[data-field="descricao"]').value.trim();
  if (!nome || !descricao) {
    setStatus("Nome e descrição são obrigatórios.", "error");
    return;
  }
  if (!editId && !arquivoSelecionado) {
    setStatus("Selecione uma foto para o colaborador.", "error");
    return;
  }

  if (saveButton) saveButton.disabled = true;
  const wasEditing = Boolean(editId);
  try {
    const existing = colaboradores.find((item) => item.id === editId);
    const imagem_path = arquivoSelecionado
      ? await uploadFoto(nome)
      : existing?.imagem_path || null;
    const payload = { nome, descricao, imagem_path };

    const query = editId
      ? supabase.from("colaboradores").update(payload).eq("id", editId)
      : supabase.from("colaboradores").insert(payload);
    const { error } = await query;
    if (error) throw error;

    limparFormulario();
    const refreshed = await listarColaboradores();
    if (refreshed.success) {
      setStatus(wasEditing ? "Colaborador atualizado." : "Colaborador cadastrado.", "success");
    } else {
      setStatus(
        `Colaborador salvo, mas não foi possível atualizar a lista: ${refreshed.error.message || refreshed.error}`,
        "error"
      );
    }
  } catch (error) {
    console.error("Erro ao salvar colaborador:", error);
    setStatus(`Erro ao salvar colaborador: ${error.message || error}`, "error");
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
};

const excluirColaborador = async (colaborador) => {
  if (!confirm(`Confirma a exclusão de "${colaborador.nome}"?`)) return;

  try {
    const { error } = await supabase.from("colaboradores").delete().eq("id", colaborador.id);
    if (error) throw error;
    colaboradores = colaboradores.filter((item) => item.id !== colaborador.id);
    renderLista();
    if (editId === colaborador.id) limparFormulario();
    setStatus("Colaborador excluído.", "success");
  } catch (error) {
    console.error("Erro ao excluir colaborador:", error);
    setStatus(`Erro ao excluir colaborador: ${error.message || error}`, "error");
  }
};

onReady(() => {
  const fileInput = document.querySelector('[data-file-input="foto"]');
  const fileTrigger = document.querySelector('[data-file-trigger="foto"]');
  const form = document.getElementById("colaborador-form");
  const clearButton = document.getElementById("colaborador-clear");

  fileTrigger?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension) || (file.type && !file.type.startsWith("image/"))) {
      fileInput.value = "";
      arquivoSelecionado = null;
      setStatus("Selecione uma imagem JPG, PNG ou WEBP.", "error");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      fileInput.value = "";
      arquivoSelecionado = null;
      setStatus("A imagem deve ter no máximo 5 MB.", "error");
      return;
    }

    arquivoSelecionado = file;
    clearPreviewUrl();
    previewUrl = URL.createObjectURL(file);
    showImagePreview(previewUrl, `Arquivo selecionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    setStatus("");
  });

  form?.addEventListener("submit", salvarColaborador);
  clearButton?.addEventListener("click", limparFormulario);
  listarColaboradores();
});
