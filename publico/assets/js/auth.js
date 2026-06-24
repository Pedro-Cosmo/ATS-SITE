import { supabase } from "./supabase-client.js";

const LOGIN_PATH = "/pages/login.html";

const buildLoginUrl = () => {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ redirect: currentPath });
  return `${LOGIN_PATH}?${params.toString()}`;
};

const redirectToLogin = () => {
  window.location.replace(buildLoginUrl());
};

const logout = async () => {
  await supabase.auth.signOut();
  window.location.href = LOGIN_PATH;
};

const onReady = (callback) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
    return;
  }

  callback();
};

// TODO: revisar este fluxo quando existir backend Node.js proprio.
// No momento a protecao administrativa depende do Supabase Auth + RPC is_admin().
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !sessionData.session) {
  redirectToLogin();
} else {
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || isAdmin !== true) {
    await supabase.auth.signOut();
    redirectToLogin();
  }
}

window.LigaAdminAuth = {
  logout,
  getSession: () => supabase.auth.getSession(),
};

onReady(() => {
  const logoutButtons = document.querySelectorAll("[data-admin-logout], #logout");

  logoutButtons.forEach((button) => {
    button.addEventListener("click", logout);
  });
});
