import { supabase } from "./supabase-client.js";

const COLABORADORES_PLACEHOLDER = "/assets/data/img/membro-placeholder.png";
const COLABORADORES_BUCKET = "site-images";

const gerarIniciais = (nome) => {
  if (!nome || typeof nome !== "string") return "C";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "C";
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

const renderMensagem = (grid, mensagem) => {
  grid.innerHTML = "";
  const aviso = document.createElement("p");
  aviso.className = "membros-vazio";
  aviso.textContent = mensagem;
  grid.appendChild(aviso);
};

const renderColaboradores = (colaboradores, grid, template) => {
  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  colaboradores.forEach((colaborador) => {
    const clone = template.content.cloneNode(true);
    const fotoWrap = clone.querySelector(".membro-foto-wrap");
    const img = clone.querySelector(".membro-foto");
    const nomeEl = clone.querySelector(".membro-nome");
    const descricaoEl = clone.querySelector(".membro-descricao");

    const nome = typeof colaborador.nome === "string" && colaborador.nome.trim()
      ? colaborador.nome.trim()
      : "Colaborador sem nome";
    const imagemPath = typeof colaborador.imagem_path === "string"
      ? colaborador.imagem_path.trim()
      : "";
    const imagem = typeof colaborador.imagem === "string" && colaborador.imagem.trim()
      ? colaborador.imagem.trim()
      : imagemPath
        ? supabase.storage.from(COLABORADORES_BUCKET).getPublicUrl(imagemPath).data.publicUrl
        : COLABORADORES_PLACEHOLDER;

    if (fotoWrap) {
      fotoWrap.setAttribute("data-iniciais", gerarIniciais(nome));
    }

    if (img) {
      img.src = imagem;
      img.alt = nome;
      img.addEventListener("error", () => {
        if (!img.src.endsWith(COLABORADORES_PLACEHOLDER)) {
          img.src = COLABORADORES_PLACEHOLDER;
          return;
        }

        if (fotoWrap) {
          fotoWrap.classList.add("sem-imagem");
        }
      });
    }

    if (nomeEl) {
      nomeEl.textContent = nome;
    }

    if (descricaoEl) {
      descricaoEl.textContent = typeof colaborador.descricao === "string"
        ? colaborador.descricao.trim()
        : "";
      descricaoEl.hidden = !descricaoEl.textContent;
    }

    fragment.appendChild(clone);
  });

  grid.appendChild(fragment);
};

const carregarColaboradores = async () => {
  const grid = document.getElementById("membros-grid");
  const template = document.getElementById("template-membro");

  if (!grid || !template) return;

  try {
    const { data, error } = await supabase
      .from("colaboradores")
      .select("nome, descricao, imagem_path")
      .order("nome", { ascending: true });
    if (error) throw error;

    const colaboradores = Array.isArray(data) ? data : [];

    if (!colaboradores.length) {
      renderMensagem(grid, "Nenhum colaborador cadastrado no momento.");
      return;
    }

    renderColaboradores(colaboradores, grid, template);
  } catch (erro) {
    console.error("Erro ao carregar colaboradores:", erro);
    renderMensagem(grid, "Nao foi possivel carregar a lista de colaboradores.");
  }
};

document.addEventListener("DOMContentLoaded", carregarColaboradores);
