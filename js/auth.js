import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      errorEl.textContent = error.message;
      return;
    }

    if (data.session) {
      // Erfolgreicher Login → Dashboard
      window.location.href = "dashboard.html";
    } else {
      errorEl.textContent =
        "Login erfolgreich, aber Session nicht verfügbar. Bitte Seite neu laden.";
    }
  });
});
