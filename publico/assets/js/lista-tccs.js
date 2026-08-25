import { buscarConteudosComFallback } from "./carregar-conteudos.js";

const extrairAno = (valor) => {
  if (!valor) return 0;
  const match = String(valor).match(/\d{4}/);
  return match ? Number(match[0]) : 0;
};

const carregarTccs = async () => {
  try {
    const tccs = await buscarConteudosComFallback("tcc", "/assets/data/tcc.json");

    tccs.sort((a, b) => {
      const anoA = extrairAno(a.ano);
      const anoB = extrairAno(b.ano);
      if (anoA !== anoB) return anoB - anoA;
      return (a.titulo || "").localeCompare(b.titulo || "", "pt-BR");
    });

    const container = document.getElementById("tcc-container");
    const template = document.getElementById("template-tcc");
    const paginacao = document.querySelector(".artigos-paginacao");
    const bolinhas = paginacao ? paginacao.querySelector(".pg-bolinhas") : null;
    const setas = paginacao ? paginacao.querySelectorAll(".pg-seta") : [];
    const setaAnterior = setas[0] || null;
    const setaProxima = setas[1] || null;
    const porPagina = 10;
    const totalPaginas = Math.max(1, Math.ceil(tccs.length / porPagina));
    const params = new URLSearchParams(window.location.search);
    let paginaAtual = Number.parseInt(params.get("page") || "1", 10);

    if (Number.isNaN(paginaAtual) || paginaAtual < 1) {
      paginaAtual = 1;
    }
    if (paginaAtual > totalPaginas) {
      paginaAtual = totalPaginas;
    }

    if (!container || !template) return;

    const atualizarUrl = (pagina) => {
      const novaUrl = new URL(window.location.href);
      novaUrl.searchParams.set("page", String(pagina));
      window.history.replaceState({}, "", novaUrl.toString());
    };

    const renderBolinhas = () => {
      if (!bolinhas) return;
      bolinhas.innerHTML = "";

      for (let i = 1; i <= totalPaginas; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `pg-bolinha${i === paginaAtual ? " is-active" : ""}`;
        btn.setAttribute("aria-label", `Pagina ${i}`);
        if (i === paginaAtual) {
          btn.setAttribute("aria-current", "page");
        }
        btn.addEventListener("click", () => {
          paginaAtual = i;
          renderPagina();
        });
        bolinhas.appendChild(btn);
      }
    };

    const atualizarSetas = () => {
      if (setaAnterior) {
        const desativar = paginaAtual <= 1;
        setaAnterior.disabled = desativar;
        setaAnterior.classList.toggle("is-disabled", desativar);
      }
      if (setaProxima) {
        const desativar = paginaAtual >= totalPaginas;
        setaProxima.disabled = desativar;
        setaProxima.classList.toggle("is-disabled", desativar);
      }
    };

    const renderPagina = () => {
      container.innerHTML = "";
      atualizarUrl(paginaAtual);

      const inicio = (paginaAtual - 1) * porPagina;
      const fim = inicio + porPagina;

      tccs.slice(inicio, fim).forEach((tcc) => {
        const clone = template.content.cloneNode(true);

        const img = clone.querySelector("img");
        const h2 = clone.querySelector("h2");
        const p = clone.querySelector(".descricao");
        const linkPdf = clone.querySelector(".btn-pdf");
        const btnDetalhe = clone.querySelector(".btn-detalhe");
        const autorEl = clone.querySelector(".autor");
        const tagsEl = clone.querySelector(".tags");

        if (img) {
          img.src = tcc.imagem || "/assets/data/img/logo.png";
          img.alt = tcc.titulo || "Imagem do TCC";
        }

        if (h2) {
          h2.textContent = tcc.titulo || "Sem titulo";
        }

        if (p) {
          const descricao = [tcc.descricaoLonga, tcc.descricaoCurta]
            .find((texto) => typeof texto === "string" && texto.trim());
          if (descricao) {
            p.textContent = descricao;
            p.style.display = "";
          } else {
            p.textContent = "";
            p.style.display = "none";
          }
        }

        if (linkPdf) {
          linkPdf.href = tcc.pdf ? encodeURI(tcc.pdf) : "#";
        }

        if (autorEl) {
          autorEl.textContent = Array.isArray(tcc.autores) && tcc.autores.length
            ? `Autor(es): ${tcc.autores.join(", ")}`
            : "";
        }

        if (tagsEl) {
          tagsEl.textContent = tcc.ano ? String(tcc.ano) : "Ano nao informado";
        }

        if (btnDetalhe) {
          btnDetalhe.addEventListener("click", () => {
            if (tcc.pdf) {
              window.open(encodeURI(tcc.pdf), "_blank");
            }
          });
        }

        container.appendChild(clone);
      });

      renderBolinhas();
      atualizarSetas();
    };

    if (setaAnterior) {
      setaAnterior.addEventListener("click", () => {
        if (paginaAtual > 1) {
          paginaAtual -= 1;
          renderPagina();
        }
      });
    }

    if (setaProxima) {
      setaProxima.addEventListener("click", () => {
        if (paginaAtual < totalPaginas) {
          paginaAtual += 1;
          renderPagina();
        }
      });
    }

    renderPagina();
  } catch (error) {
    console.error("Erro ao carregar TCCs:", error);
  }
};

carregarTccs();
