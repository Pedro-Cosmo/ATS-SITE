const setupHeaderMenu = () => {
  const header = document.querySelector(".header");
  if (!header) return;

  const dropdowns = header.querySelectorAll(".dropdown");
  const closeDropdowns = () => {
    dropdowns.forEach((drop) => drop.classList.remove("open"));
  };

  const toggle = header.querySelector(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (!isOpen) {
        closeDropdowns();
      }
    });
  }

  dropdowns.forEach((drop) => {
    const button = drop.querySelector(".dropbtn");
    if (!button) return;

    button.addEventListener("click", (event) => {
      if (window.matchMedia("(max-width: 800px)").matches) {
        event.preventDefault();
        drop.classList.toggle("open");
      }
    });
  });

  const menuLinks = header.querySelectorAll(".menu a");
  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 800px)").matches) {
        header.classList.remove("menu-open");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
        }
        closeDropdowns();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!window.matchMedia("(max-width: 800px)").matches) return;
    if (!header.classList.contains("menu-open")) return;
    if (header.contains(event.target)) return;
    header.classList.remove("menu-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }
    closeDropdowns();
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const includes = Array.from(document.querySelectorAll("[data-include]"));
  const tasks = includes.map(async (el) => {
    const path = el.getAttribute("data-include");
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to fetch ${path}`);
      const text = await res.text();
      el.innerHTML = text;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Include error:", path, err);
    }
  });

  Promise.all(tasks).then(() => {
    setupHeaderMenu();
  });
});
