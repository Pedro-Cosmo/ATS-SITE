const MEMBROS_DATA_URL = "/assets/data/json/membros.json";
const MEMBROS_PLACEHOLDER = "/assets/data/img/membro-placeholder.png";

const gerarIniciais = (nome) => {
  if (!nome || typeof nome !== "string") return "M";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "M";
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

const renderMembros = (membros, grid, template) => {
  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  membros.forEach((membro) => {
    const clone = template.content.cloneNode(true);
    const fotoWrap = clone.querySelector(".membro-foto-wrap");
    const img = clone.querySelector(".membro-foto");
    const nomeEl = clone.querySelector(".membro-nome");

    const nome = typeof membro.nome === "string" && membro.nome.trim()
      ? membro.nome.trim()
      : "Membro sem nome";
    const imagem = typeof membro.imagem === "string" && membro.imagem.trim()
      ? membro.imagem.trim()
      : MEMBROS_PLACEHOLDER;

    if (fotoWrap) {
      fotoWrap.setAttribute("data-iniciais", gerarIniciais(nome));
    }

    if (img) {
      img.src = imagem;
      img.alt = nome;
      img.addEventListener("error", () => {
        if (!img.src.endsWith(MEMBROS_PLACEHOLDER)) {
          img.src = MEMBROS_PLACEHOLDER;
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

    fragment.appendChild(clone);
  });

  grid.appendChild(fragment);
};

const carregarMembros = async () => {
  const grid = document.getElementById("membros-grid");
  const template = document.getElementById("template-membro");

  if (!grid || !template) return;

  try {
    const resposta = await fetch(MEMBROS_DATA_URL, { cache: "force-cache" });
    if (!resposta.ok) throw new Error("Falha ao carregar membros");

    const dados = await resposta.json();
    const membros = Array.isArray(dados) ? dados : [];

    if (!membros.length) {
      renderMensagem(grid, "Nenhum membro cadastrado no momento.");
      return;
    }

    renderMembros(membros, grid, template);
  } catch (erro) {
    renderMensagem(grid, "Não foi possível carregar a lista de membros.");
  }
};

document.addEventListener("DOMContentLoaded", carregarMembros);
