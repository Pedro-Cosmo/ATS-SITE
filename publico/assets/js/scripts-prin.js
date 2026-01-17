const dropdowns = document.querySelectorAll(".dropdown");

dropdowns.forEach(function(drop) {
  const button = drop.querySelector(".dropbtn");

  button.addEventListener("click", function() {
    drop.classList.toggle("open");
  });
});



function carregarMiniNoticias() {
  fetch("/publico/assets/data/noticias.json")
    .then(res => res.json())
    .then(noticias => {

      const grid = document.querySelector("#grid-noticias");
      const template = document.querySelector("#template-mini");

      const noticiasMini = noticias.filter(n => n.id >= 1 && n.id <= 6);

      noticiasMini.forEach(noticia => {

        const clone = template.content.cloneNode(true);

        const img = clone.querySelector("img");
        const p = clone.querySelector("p");
        const card = clone.querySelector(".card-mini");

        img.src = noticia.imagem;
        img.alt = noticia.descricaoCurta;
        p.textContent = noticia.descricaoCurta;

        card.addEventListener("click", () => {
          window.location.href = `/publico/pages/artdetalhe.html?id=${noticia.id}`;
        });

        grid.appendChild(clone);
      });

    });
}

carregarMiniNoticias();
