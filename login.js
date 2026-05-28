const form = document.querySelector("[data-login-form]");
const statusText = document.querySelector("[data-login-status]");
const ownerEmail = "decanma1985@gmail.com";
const allowedNextPages = new Set(["admin.html"]);

function getNextPage() {
  const next = new URLSearchParams(window.location.search).get("next") || "admin.html";
  return allowedNextPages.has(next) ? next : "admin.html";
}

async function init() {
  const session = await fetch("/api/admin-session", { credentials: "include", cache: "no-store" }).catch(() => null);
  if (session?.ok) {
    window.location.replace(getNextPage());
  }
}

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

    window.location.href = getNextPage();
  } catch {
    statusText.textContent = "登入服務暫時無法使用，請稍後再試。";
  }
});

init();
