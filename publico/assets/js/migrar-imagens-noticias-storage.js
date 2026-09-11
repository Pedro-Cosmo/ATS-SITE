import { supabase } from "./supabase-client.js";

const BUCKET = "site-images";
const ASSET_ROOT = "/assets/img/importacao-noticias-2026";
const FILE_NAMES = [
  "image1.png", "image2.png", "image3.png", "image4.png", "image5.jpg",
  "image6.jpg", "image7.png", "image8.png", "image9.jpg", "image10.png",
  "image11.png", "image12.jpg", "image13.png", "image14.png", "image15.png",
  "image16.png", "image17.png", "image18.jpg", "image19.jpg", "image20.jpg",
];

const TARGETS = [
  {
    id: "fe000c27-35a2-4129-a51f-2c0e7e060390",
    titulo: "Nasce a LIGATS: uma iniciativa na Avaliação de Tecnologias em Saúde na graduação (UFRJ-Macaé)",
  },
  {
    id: "712439e5-74b7-4ff4-a96c-759754717fac",
    titulo: "A LIGATS tem sua criação divulgada em boletim da REBRATS",
  },
  {
    id: "7944ee6e-3590-4bde-a447-07416848fcc5",
    titulo: "GEESFAR/NATS/UFRJ é contemplado com curso do Ministério da Saúde",
  },
  {
    id: "f476ea97-c9a1-470c-9a43-f1eea41e39b9",
    titulo: "Nova disciplina eletiva amplia formação em Avaliação de Tecnologias em Saúde",
  },
  {
    id: "04e1b99b-de70-433e-aa08-0f53d6cc4e56",
    titulo: "O GEESFAR/NATS/UFRJ e a LIGATS promovem o Curso de Extensão “Síntese de Evidências - Oficina de inverno”",
  },
  {
    id: "bca1fca7-d1a2-49f3-aef5-bbe642d2857a",
    titulo: "LIGATS marca presença no VI Congresso da REBRATS",
  },
  {
    id: "58b7e84d-6bd2-46b5-ae4e-d9880d57df0f",
    titulo: "LIGATS inicia em 2026 a promoção de mini-cursos sobre importantes temas da saúde pública para à formação acadêmica",
  },
  {
    id: "a4a7eee4-906c-4ab4-9370-24b37aa414c4",
    titulo: "LIGATS marca presença na 14ª SIAc com apresentações de alto impacto científico",
  },
];

const button = document.querySelector("#migrar");
const status = document.querySelector("#status");
const resultList = document.querySelector("#resultados");
let isRunning = false;

const setStatus = (text, className = "") => {
  status.textContent = text;
  status.className = className;
};

const addResult = (text, className = "") => {
  const item = document.createElement("li");
  item.textContent = text;
  item.className = className;
  resultList.appendChild(item);
};

const slugFor = (title) => `noticia-${String(title || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")}`;

const validateAdmin = async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    const redirect = encodeURIComponent(window.location.pathname);
    setStatus("Sessão não encontrada. Entre no painel e volte para esta página.", "erro");
    const link = document.createElement("a");
    link.href = `/pages/login.html?redirect=${redirect}`;
    link.textContent = "Entrar no painel";
    status.append(" ", link);
    return false;
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw adminError;
  if (isAdmin !== true) throw new Error("A conta conectada não possui permissão administrativa.");
  return true;
};

const sha256 = async (blob) => {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const assertValidFileName = (fileName) => {
  if (!/^[a-z0-9_-]+\.(?:png|jpe?g)$/i.test(fileName)) {
    throw new Error(`Nome de arquivo inválido: ${fileName}.`);
  }
};

const validateImageBlob = async (fileName, blob) => {
  if (!blob.size) throw new Error(`${fileName} está vazio.`);
  if (!String(blob.type || "").startsWith("image/")) {
    throw new Error(`${fileName} não foi recebido como imagem (${blob.type || "sem MIME"}).`);
  }

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const validDimensions = bitmap.width > 0 && bitmap.height > 0;
    bitmap.close();
    if (!validDimensions) throw new Error(`${fileName} não possui dimensões válidas.`);
  }
};

const prepareSources = async () => {
  if (new Set(FILE_NAMES).size !== FILE_NAMES.length) throw new Error("Há nomes de imagens duplicados.");
  const sources = [];

  for (let index = 0; index < FILE_NAMES.length; index += 1) {
    const fileName = FILE_NAMES[index];
    assertValidFileName(fileName);
    setStatus(`Validando imagem ${index + 1} de ${FILE_NAMES.length}: ${fileName}…`);
    const response = await fetch(`${ASSET_ROOT}/${fileName}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Não foi possível ler ${fileName} (${response.status}).`);

    const blob = await response.blob();
    await validateImageBlob(fileName, blob);
    sources.push({
      blob,
      fileName,
      hash: await sha256(blob),
      contentType: blob.type,
    });
  }

  return sources;
};

const publicUrlFor = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

const readStoredObject = async (path) => {
  const response = await fetch(`${publicUrlFor(path)}?check=${Date.now()}`, { cache: "no-store" });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`Falha ao conferir ${path} (${response.status}).`);

  const blob = await response.blob();
  if (!String(blob.type || "").startsWith("image/")) {
    throw new Error(`O objeto ${path} não possui MIME de imagem.`);
  }
  return { hash: await sha256(blob), size: blob.size };
};

const uploadSource = async (source, index) => {
  setStatus(`Enviando imagem ${index + 1} de ${FILE_NAMES.length}: ${source.fileName}…`);
  const extension = source.fileName.split(".").pop().toLowerCase();
  const baseName = source.fileName.replace(/\.[^.]+$/, "").toLowerCase();
  const storagePath = `noticias/ligats-setembro-2026-${baseName}-${source.hash}.${extension}`;
  const existing = await readStoredObject(storagePath);

  if (existing) {
    if (existing.hash !== source.hash || existing.size !== source.blob.size) {
      throw new Error(`Já existe um objeto diferente no caminho calculado para ${source.fileName}.`);
    }
    return storagePath;
  }

  const { data, error } = await supabase.storage.from(BUCKET).upload(storagePath, source.blob, {
    cacheControl: "3600",
    contentType: source.contentType,
    upsert: false,
  });

  if (error) {
    const duplicate = error.statusCode === "409"
      || String(error.message || "").toLowerCase().includes("already exists");
    if (!duplicate) throw new Error(`Falha no upload de ${source.fileName}: ${error.message || error}`);
  }

  const uploaded = await readStoredObject(storagePath);
  if (!uploaded || uploaded.hash !== source.hash || uploaded.size !== source.blob.size) {
    throw new Error(`A verificação do upload de ${source.fileName} falhou.`);
  }
  return data?.path || storagePath;
};

const loadSnapshot = async () => {
  setStatus("Conferindo as oito notícias antes da migração…");
  const ids = TARGETS.map((target) => target.id);
  const { data: rows, error } = await supabase
    .from("conteudos")
    .select("id,slug,titulo,imagem_path,dados,updated_at")
    .eq("tipo", "noticia")
    .in("id", ids);
  if (error) throw error;
  if (rows.length !== TARGETS.length) {
    throw new Error(`Esperadas ${TARGETS.length} notícias; encontradas ${rows.length}.`);
  }

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return TARGETS.map((target) => {
    const row = rowsById.get(target.id);
    if (!row || row.titulo !== target.titulo || row.slug !== slugFor(target.titulo)) {
      throw new Error(`A notícia ${target.id} não corresponde ao título esperado.`);
    }
    return row;
  });
};

const migrateBlock = (block, pathMap) => {
  const nextBlock = { ...block };
  if (nextBlock.path && pathMap[nextBlock.path]) nextBlock.path = pathMap[nextBlock.path];
  if (Array.isArray(nextBlock.imagens)) {
    nextBlock.imagens = nextBlock.imagens.map((image) => ({
      ...image,
      path: pathMap[image.path] || image.path,
    }));
  }
  return nextBlock;
};

const findLocalPaths = (data, coverPath) => {
  const paths = [coverPath, data?.imagem];
  (Array.isArray(data?.blocos) ? data.blocos : []).forEach((block) => {
    if (block.path) paths.push(block.path);
    (Array.isArray(block.imagens) ? block.imagens : []).forEach((image) => paths.push(image.path));
  });
  return paths.filter((path) => String(path || "").startsWith(`${ASSET_ROOT}/`));
};

const migrateRows = async (snapshot, pathMap) => {
  for (let index = 0; index < snapshot.length; index += 1) {
    const row = snapshot[index];
    setStatus(`Atualizando notícia ${index + 1} de ${snapshot.length}: ${row.titulo}…`);
    const nextData = structuredClone(row.dados || {});
    nextData.imagem = pathMap[nextData.imagem] || nextData.imagem;
    nextData.blocos = (Array.isArray(nextData.blocos) ? nextData.blocos : [])
      .map((block) => migrateBlock(block, pathMap));
    const nextCover = pathMap[row.imagem_path] || row.imagem_path;

    if (!nextCover || nextData.imagem !== nextCover) {
      throw new Error(`Capa inconsistente na notícia “${row.titulo}”.`);
    }
    if (findLocalPaths(nextData, nextCover).length) {
      throw new Error(`Restaram caminhos locais na notícia “${row.titulo}”.`);
    }

    const { data: updated, error: updateError } = await supabase
      .from("conteudos")
      .update({ imagem_path: nextCover, dados: nextData })
      .eq("id", row.id)
      .eq("updated_at", row.updated_at)
      .select("id,imagem_path,dados,updated_at")
      .single();
    if (updateError) throw new Error(`Falha ao atualizar “${row.titulo}”: ${updateError.message || updateError}`);
    if (!updated || updated.id !== row.id || updated.imagem_path !== updated.dados?.imagem) {
      throw new Error(`O Supabase não confirmou a atualização de “${row.titulo}”.`);
    }

    addResult(row.titulo, "sucesso");
  }
};

const verifyMigration = async () => {
  const rows = await loadSnapshot();
  const residual = rows.flatMap((row) => findLocalPaths(row.dados, row.imagem_path));
  if (residual.length) throw new Error(`A verificação encontrou ${residual.length} caminhos locais restantes.`);
};

button.addEventListener("click", async () => {
  if (isRunning) return;
  isRunning = true;
  button.disabled = true;
  resultList.replaceChildren();

  try {
    if (!(await validateAdmin())) return;
    const snapshot = await loadSnapshot();
    const sources = await prepareSources();
    const pathMap = {};

    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index];
      pathMap[`${ASSET_ROOT}/${source.fileName}`] = await uploadSource(source, index);
    }

    await migrateRows(snapshot, pathMap);
    await verifyMigration();
    setStatus("Migração concluída: 20 imagens estão no Cloud Storage e as oito notícias foram atualizadas.", "sucesso");
    button.hidden = true;
  } catch (error) {
    console.error("Erro na migração:", error);
    setStatus(`A migração parou: ${error.message || error}`, "erro");
    button.disabled = false;
    isRunning = false;
  }
});

try {
  if (await validateAdmin()) {
    button.hidden = false;
    setStatus("Sessão administrativa confirmada. Clique no botão para iniciar a migração.");
  }
} catch (error) {
  console.error("Erro ao validar administrador:", error);
  setStatus(`Não foi possível validar a sessão: ${error.message || error}`, "erro");
}
