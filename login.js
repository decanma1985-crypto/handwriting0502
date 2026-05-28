import { handleAuthCallback, login, logout } from "https://esm.sh/@netlify/identity";

const form = document.querySelector("[data-login-form]");
const statusText = document.querySelector("[data-login-status]");
const ownerEmail = "decanma1985@gmail.com";

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
    const user = await login(String(data.get("email")), String(data.get("password")));
    if (user?.email !== ownerEmail) {
      await logout().catch(() => {});
      statusText.textContent = "這個帳號沒有後台權限，請使用網站管理者信箱登入。";
      return;
    }

    window.location.href = "admin.html";
  } catch {
    statusText.textContent = "登入失敗，請確認帳號、密碼與後台權限。";
  }
});

init();
