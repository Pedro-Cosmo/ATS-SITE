import { supabase } from "./supabase-client.js";

const MAX_PDF_MB = 10;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
const PDF_BUCKET = "site-pdfs";
const PDF_DEFAULT_FOLDER = "tccs";

let pdfSelecionado = null;
let pdfUrlPublica = null;

const getPdfInput = () => document.querySelector("#pdf-tcc") || document.querySelector('[data-file-input="pdf"]');
const getPdfInfo = () => document.querySelector("#pdf-info") || document.querySelector('[data-file-feedback="pdf"]');

const onReady = (callback) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
    return;
  }

  callback();
};

export function gerarSlug(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isPdf = (file) => {
  const name = String(file && file.name ? file.name : "").toLowerCase();
  return file && (file.type === "application/pdf" || name.endsWith(".pdf"));
};

const formatMb = (bytes) => (bytes / 1024 / 1024).toFixed(2);

export function definirPdfTcc(file) {
  const pdfInput = getPdfInput();
  const pdfInfo = getPdfInfo();

  if (!file) {
    pdfSelecionado = null;
    pdfUrlPublica = null;
    return false;
  }

  if (!isPdf(file)) {
    if (pdfInfo) {
      pdfInfo.textContent = "Selecione apenas arquivos PDF.";
    }
    if (pdfInput) {
      pdfInput.value = "";
    }
    pdfSelecionado = null;
    pdfUrlPublica = null;
    return false;
  }

  if (file.size > MAX_PDF_BYTES) {
    if (pdfInfo) {
      pdfInfo.textContent = `O PDF deve ter no maximo ${MAX_PDF_MB} MB.`;
    }
    if (pdfInput) {
      pdfInput.value = "";
    }
    pdfSelecionado = null;
    pdfUrlPublica = null;
    return false;
  }

  pdfSelecionado = file;
  pdfUrlPublica = null;

  if (pdfInfo) {
    pdfInfo.textContent = `PDF selecionado: ${file.name} (${formatMb(file.size)} MB)`;
  }

  return true;
}

export function limparPdfTcc() {
  const pdfInput = getPdfInput();
  const pdfInfo = getPdfInfo();

  pdfSelecionado = null;
  pdfUrlPublica = null;

  if (pdfInput) {
    pdfInput.value = "";
  }
  if (pdfInfo) {
    pdfInfo.textContent = "";
  }
}

export function getPdfTccSelecionado() {
  return pdfSelecionado;
}

export async function uploadPdfTcc(titulo, folder = PDF_DEFAULT_FOLDER) {
  if (!pdfSelecionado) {
    throw new Error("Nenhum PDF selecionado.");
  }

  const pdfInfo = getPdfInfo();
  const slug = gerarSlug(titulo) || "tcc";
  const pasta = gerarSlug(folder) || PDF_DEFAULT_FOLDER;
  const extensao = pdfSelecionado.name.split(".").pop() || "pdf";
  const nomeArquivo = `${slug}-${Date.now()}.${extensao.toLowerCase()}`;
  const caminhoArquivo = `${pasta}/${nomeArquivo}`;
  const destino = `${PDF_BUCKET}/${caminhoArquivo}`;

  if (pdfInfo) {
    pdfInfo.textContent = `Enviando PDF para ${destino}...`;
  }

  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(caminhoArquivo, pdfSelecionado, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    const message = error.message || "Erro desconhecido no Supabase Storage.";
    if (pdfInfo) {
      pdfInfo.textContent = `Erro ao enviar para ${destino}: ${message}`;
    }
    console.error("Erro ao enviar PDF:", error);
    throw new Error(`Erro ao enviar PDF para ${destino}: ${message}`);
  }

  const { data: publicData } = supabase.storage
    .from(PDF_BUCKET)
    .getPublicUrl(caminhoArquivo);

  pdfUrlPublica = publicData.publicUrl;

  if (pdfInfo) {
    pdfInfo.textContent = `PDF enviado para ${destino}.`;
  }

  return {
    path: data.path,
    publicUrl: publicData.publicUrl,
  };
}

onReady(() => {
  const pdfInput = getPdfInput();

  pdfInput?.addEventListener("change", () => {
    definirPdfTcc(pdfInput.files[0]);
  });
});

window.LigaTccUpload = {
  bucket: PDF_BUCKET,
  defaultFolder: PDF_DEFAULT_FOLDER,
  getPdfTccSelecionado,
  limparPdfTcc,
  uploadPdfTcc,
};
