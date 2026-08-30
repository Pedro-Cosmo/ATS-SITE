import { supabase } from "./supabase-client.js";

const PLACEHOLDER = "/assets/data/img/membro-placeholder.png";

const renderMessage = (container, message) => {
  container.innerHTML = "";
  const p = document.createElement("p");
  p.className = "membros-vazio";
  p.textContent = message;
  container.appendChild(p);
};

function sortChildren(a, b) {
  const ao = a.ordem ?? 0;
  const bo = b.ordem ?? 0;
  if (ao !== bo) return ao - bo;
  const an = (a.nome || "").toLowerCase();
  const bn = (b.nome || "").toLowerCase();
  return an < bn ? -1 : an > bn ? 1 : 0;
}

function buildTree(rows) {
  const map = new Map();
  const roots = [];

  rows.forEach((r) => {
    map.set(r.id, Object.assign({}, r, { filhos: [] }));
  });

  for (const node of map.values()) {
    const sid = node.supervisor_id;
    if (!sid) {
      roots.push(node);
      continue;
    }

    if (sid === node.id) {
      console.warn("Membro com supervisor_id igual ao próprio:", node.id);
      roots.push(node);
      continue;
    }

    const parent = map.get(sid);
    if (parent) {
      parent.filhos.push(node);
    } else {
      console.warn("Supervisor não encontrado para membro:", node.id, sid);
      roots.push(node);
    }
  }

  // sort recursively
  function sortRec(list) {
    list.sort(sortChildren);
    list.forEach((n) => sortRec(n.filhos));
  }

  sortRec(roots);
  return roots;
}

function createNodeElement(node) {
  const li = document.createElement("li");
  li.className = "organograma-node";

  const card = document.createElement("div");
  card.className = "organograma-card";

  const img = document.createElement("img");
  img.className = "organograma-foto";
  img.alt = node.nome || "Membro";
  if (node.foto_path) {
    const { data: publicData } = supabase.storage.from("site-images").getPublicUrl(node.foto_path);
    img.src = publicData.publicUrl;
  } else {
    img.src = PLACEHOLDER;
  }
  img.onerror = () => {
    if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER;
  };

  const info = document.createElement("div");
  info.className = "organograma-info";

  const nome = document.createElement("div");
  nome.className = "organograma-nome";
  nome.textContent = node.nome || "(sem nome)";

  const cargo = document.createElement("div");
  cargo.className = "organograma-cargo";
  cargo.textContent = node.cargo || "";

  const setor = document.createElement("div");
  setor.className = "organograma-setor";
  setor.textContent = node.setor || "";

  info.appendChild(nome);
  info.appendChild(cargo);
  info.appendChild(setor);

  card.appendChild(img);
  card.appendChild(info);
  li.appendChild(card);

  if (node.filhos && node.filhos.length) {
    const filhosWrap = document.createElement("ul");
    filhosWrap.className = "organograma-filhos";
    node.filhos.forEach((f) => {
      filhosWrap.appendChild(createNodeElement(f));
    });
    li.appendChild(filhosWrap);
  }

  return li;
}

function getSetores(rows) {
  const setores = rows
    .map((membro) => (typeof membro.setor === "string" ? membro.setor.trim() : ""))
    .filter(Boolean);

  return [...new Set(setores)].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
}

function renderOrganograma(container, rows) {
  const roots = buildTree(rows);

  container.innerHTML = "";
  const treeWrap = document.createElement("ul");
  treeWrap.className = "organograma-tree";

  roots.forEach((root) => {
    treeWrap.appendChild(createNodeElement(root));
  });

  container.appendChild(treeWrap);
}

function configurarSetores(rows, nav, titulo, container) {
  const setores = getSetores(rows);

  nav.innerHTML = "";

  if (!setores.length) {
    nav.hidden = true;
    titulo.hidden = true;
    renderOrganograma(container, rows);
    return;
  }

  const buttons = new Map();

  const selecionarSetor = (setorSelecionado) => {
    const membrosDoSetor = rows.filter((membro) => {
      const setor = typeof membro.setor === "string" ? membro.setor.trim() : "";
      return setor === setorSelecionado;
    });

    buttons.forEach((button, setor) => {
      const isActive = setor === setorSelecionado;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    titulo.textContent = setorSelecionado;
    renderOrganograma(container, membrosDoSetor);
  };

  setores.forEach((setor) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "setor-button";
    button.textContent = setor;
    button.setAttribute("aria-controls", "organograma");
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selecionarSetor(setor));

    buttons.set(setor, button);
    nav.appendChild(button);
  });

  nav.hidden = false;
  titulo.hidden = false;
  selecionarSetor(setores[0]);
}

async function carregarMembros() {
  const container = document.getElementById("organograma");
  const setoresNav = document.querySelector(".setores-nav");
  const setorTitulo = document.getElementById("setor-titulo");
  if (!container) return;

  try {
    const { data, error } = await supabase
      .from("membros")
      .select("id, nome, cargo, setor, foto_path, supervisor_id, ordem")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      renderMessage(container, "Nenhum membro cadastrado no momento.");
      return;
    }

    if (!setoresNav || !setorTitulo) {
      renderOrganograma(container, rows);
      return;
    }

    configurarSetores(rows, setoresNav, setorTitulo, container);
  } catch (err) {
    console.error(err);
    renderMessage(container, "Não foi possível carregar o organograma.");
  }
}

document.addEventListener("DOMContentLoaded", carregarMembros);
