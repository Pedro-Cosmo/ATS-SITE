import { supabase } from "./supabase-client.js";

const PLACEHOLDER = "/assets/data/img/membro-placeholder.png";
const TODOS_OS_MEMBROS = Symbol("todos-os-membros");
let equalizeFrame = 0;

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

function createOrganogramaTree(rows) {
  const roots = buildTree(rows);
  const treeWrap = document.createElement("ul");
  treeWrap.className = "organograma-tree";

  roots.forEach((root) => {
    treeWrap.appendChild(createNodeElement(root));
  });

  return treeWrap;
}

function scheduleCardEqualization(container) {
  container.style.removeProperty("--organograma-card-height");
  cancelAnimationFrame(equalizeFrame);

  equalizeFrame = requestAnimationFrame(() => {
    const cards = Array.from(container.querySelectorAll(".organograma-card"));
    if (!cards.length) return;

    const largestHeight = Math.max(...cards.map((card) => card.getBoundingClientRect().height));
    container.style.setProperty("--organograma-card-height", `${Math.ceil(largestHeight)}px`);
  });
}

function renderOrganograma(container, rows) {
  container.innerHTML = "";
  const treeWrap = createOrganogramaTree(rows);
  container.appendChild(treeWrap);
  scheduleCardEqualization(container);
}

function renderTodosOsSetores(container, rows, setores) {
  container.innerHTML = "";

  const allGroups = document.createElement("div");
  allGroups.className = "organograma-todos";

  const appendGroup = (label, members) => {
    if (!members.length) return;

    const group = document.createElement("section");
    group.className = "organograma-grupo";
    group.setAttribute("aria-label", label);

    const heading = document.createElement("h3");
    heading.className = "organograma-grupo-titulo";
    heading.textContent = label;

    group.append(heading, createOrganogramaTree(members));
    allGroups.appendChild(group);
  };

  setores.forEach((setor) => {
    const members = rows.filter((member) => (
      typeof member.setor === "string" && member.setor.trim() === setor
    ));
    appendGroup(setor, members);
  });

  const membersWithoutSector = rows.filter((member) => (
    typeof member.setor !== "string" || !member.setor.trim()
  ));
  appendGroup("Sem setor", membersWithoutSector);

  container.appendChild(allGroups);
  scheduleCardEqualization(container);
}

function configurarSetores(rows, nav, titulo, container) {
  const setores = getSetores(rows);

  nav.innerHTML = "";
  const buttons = new Map();

  const selecionarSetor = (setorSelecionado) => {
    buttons.forEach((button, setor) => {
      const isActive = setor === setorSelecionado;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (setorSelecionado === TODOS_OS_MEMBROS) {
      titulo.textContent = "Todos os membros";
      renderTodosOsSetores(container, rows, setores);
      return;
    }

    const membrosDoSetor = rows.filter((membro) => {
      const setor = typeof membro.setor === "string" ? membro.setor.trim() : "";
      return setor === setorSelecionado;
    });

    titulo.textContent = setorSelecionado;
    renderOrganograma(container, membrosDoSetor);
  };

  const appendFilterButton = (value, label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "setor-button";
    button.textContent = label;
    button.setAttribute("aria-controls", "organograma");
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selecionarSetor(value));

    buttons.set(value, button);
    nav.appendChild(button);
  };

  appendFilterButton(TODOS_OS_MEMBROS, "Todos");
  setores.forEach((setor) => {
    appendFilterButton(setor, setor);
  });

  nav.hidden = false;
  titulo.hidden = false;
  selecionarSetor(TODOS_OS_MEMBROS);
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
window.addEventListener("resize", () => {
  const container = document.getElementById("organograma");
  if (container) scheduleCardEqualization(container);
});
