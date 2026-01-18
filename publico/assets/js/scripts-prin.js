const dropdowns = document.querySelectorAll(".dropdown");

dropdowns.forEach(function(drop) {
  const button = drop.querySelector(".dropbtn");

  button.addEventListener("click", function() {
    drop.classList.toggle("open");
  });
});



function carregarNoticias() {
  fetch("/assets/data/noticias.json")
    .then(res => res.json())
    .then(noticias => {
      const grid = document.querySelector("#grid-noticias");
      const template = document.querySelector("#template-mini");
      const noticiaPrincipal = document.querySelector(".noticia-principal");
      const principalImg = noticiaPrincipal ? noticiaPrincipal.querySelector("img") : null;
      const principalLegenda = noticiaPrincipal ? noticiaPrincipal.querySelector(".legenda-grande") : null;
      const paginacao = document.querySelector(".paginacao");
      const bolinhas = paginacao ? paginacao.querySelector(".pg-bolinhas") : null;
      const setas = paginacao ? paginacao.querySelectorAll(".pg-seta") : [];
      const setaAnterior = setas[0] || null;
      const setaProxima = setas[1] || null;
      const porPagina = 7; // 1 principal + 6 menores

      if (!grid || !template || !noticiaPrincipal) return;

      const noticiasOrdenadas = [...noticias].sort((a, b) => (a.id || 0) - (b.id || 0));
      const totalPaginas = Math.max(1, Math.ceil(noticiasOrdenadas.length / porPagina));
      let paginaAtual = 1;

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

      const renderPagina = () => {
        grid.innerHTML = "";

        const inicio = (paginaAtual - 1) * porPagina;
        const pagina = noticiasOrdenadas.slice(inicio, inicio + porPagina);
        const principal = pagina[0];
        const minis = pagina.slice(1);

        if (principal) {
          if (principalImg) {
            principalImg.src = principal.imagem || "";
            principalImg.alt = principal.descricaoCurta || principal.titulo || "Noticia principal";
          }
          if (principalLegenda) {
            principalLegenda.textContent = principal.descricaoCurta || principal.titulo || "";
          }
          noticiaPrincipal.onclick = () => {
            window.location.href = `/pages/noticias-template.html?id=${principal.id}`;
          };
        }

        minis.forEach(noticia => {
          const clone = template.content.cloneNode(true);
          const img = clone.querySelector("img");
          const p = clone.querySelector("p");
          const card = clone.querySelector(".card-mini");

          if (img) {
            img.src = noticia.imagem || "";
            img.alt = noticia.descricaoCurta || noticia.titulo || "Noticia";
          }
          if (p) {
            p.textContent = noticia.descricaoCurta || noticia.titulo || "";
          }
          if (card) {
            card.addEventListener("click", () => {
              window.location.href = `/pages/noticias-template.html?id=${noticia.id}`;
            });
          }

          grid.appendChild(clone);
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
    });
}

carregarNoticias();
