const dropdowns = document.querySelectorAll(".dropdown");

dropdowns.forEach(function(drop) {
  const button = drop.querySelector(".dropbtn");

  button.addEventListener("click", function() {
    drop.classList.toggle("open");
  });
});
