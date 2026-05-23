import { handleAuthCallback, login } from "https://esm.sh/@netlify/identity";

const form = document.querySelector("[data-login-form]");
const statusText = document.querySelector("[data-login-status]");

async function init() {
  try {
    await handleAuthCallback();
  } catch {
    statusText.textContent = "登入回傳處理失敗，請重新登入。";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  statusText.textContent = "登入中...";

  try {
    await login(String(data.get("email")), String(data.get("password")));
    window.location.href = "admin.html";
  } catch {
    statusText.textContent = "登入失敗，請確認帳號、密碼與後台權限。";
  }
});

init();
