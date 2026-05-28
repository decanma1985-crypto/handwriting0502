const form = document.querySelector("[data-login-form]");
const statusText = document.querySelector("[data-login-status]");
const ownerEmail = "decanma1985@gmail.com";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  statusText.textContent = "登入中...";

  try {
    const email = String(data.get("email")).trim().toLowerCase();
    if (email !== ownerEmail) {
      statusText.textContent = "這個帳號沒有後台權限，請使用網站管理者信箱登入。";
      return;
    }

    const response = await fetch("/api/admin-login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: String(data.get("password")),
      }),
    });

    if (!response.ok) {
      statusText.textContent = "登入失敗，請確認後台專用密碼。";
      return;
    }

    window.location.href = "admin.html";
  } catch {
    statusText.textContent = "登入服務暫時無法使用，請稍後再試。";
  }
});
