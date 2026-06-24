import { supabase } from "./supabase-client.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const status = document.getElementById("login-status");
  const submit = form.querySelector(".login-submit");

  const setStatus = (message, type = "") => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-success", type === "success");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
      setStatus("Informe e-mail e senha.", "error");
      return;
    }

    if (submit) {
      submit.disabled = true;
    }

    setStatus("Entrando...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus("E-mail ou senha inv\u00e1lidos.", "error");
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

      if (adminError || isAdmin !== true) {
        await supabase.auth.signOut();
        setStatus("Este usu\u00e1rio n\u00e3o tem permiss\u00e3o de administrador.", "error");
        return;
      }

      setStatus("Login realizado.", "success");

      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("redirect") || "/pages/admin.html";
    } catch (error) {
      setStatus("N\u00e3o foi poss\u00edvel entrar agora. Tente novamente.", "error");
    } finally {
      if (submit) {
        submit.disabled = false;
      }
    }
  });
});
