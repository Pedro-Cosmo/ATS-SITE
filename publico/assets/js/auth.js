(() => {
  const TOKEN_STORAGE_KEY = "token";
  const USER_STORAGE_KEY = "ligaats.devUser";
  const LOGIN_PATH = "/pages/login.html";

  const getToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY);

  const buildLoginUrl = () => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({ redirect: currentPath });
    return `${LOGIN_PATH}?${params.toString()}`;
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.location.href = LOGIN_PATH;
  };

  const requireAuth = () => {
    // Protecao temporaria apenas para desenvolvimento.
    // Isto nao e seguranca real: qualquer pessoa pode editar o localStorage.
    // TODO: substituir por validacao real de JWT no backend Node.js.
    if (!getToken()) {
      window.location.replace(buildLoginUrl());
      return false;
    }

    return true;
  };

  window.LigaAdminAuth = {
    getToken,
    logout,
    requireAuth,
  };

  if (!requireAuth()) return;

  document.addEventListener("DOMContentLoaded", () => {
    const logoutButtons = document.querySelectorAll("[data-admin-logout]");

    logoutButtons.forEach((button) => {
      button.addEventListener("click", logout);
    });
  });
})();
