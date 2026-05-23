const defaultProducts = [
  {
    id: "copybook",
    badge: "字帖",
    name: "靜心手寫字帖",
    description: "收錄療癒短句與留白練習頁，適合每天 10 分鐘慢慢書寫。",
    price: "380",
    priceLabel: "NT$ 380",
    mediaClass: "media-ink",
    url: "",
    visible: true,
  },
  {
    id: "reading-notebook",
    badge: "筆記",
    name: "閱讀思考筆記本",
    description: "為摘句、心得、行動筆記設計，陪你把一本書讀進生活裡。",
    price: "420",
    priceLabel: "NT$ 420",
    mediaClass: "media-book",
    url: "",
    visible: true,
  },
  {
    id: "postcards",
    badge: "卡片",
    name: "療癒文字明信片組",
    description: "一組 12 張，適合寄給朋友，也適合放在書桌提醒自己。",
    price: "260",
    priceLabel: "NT$ 260",
    mediaClass: "media-card",
    url: "",
    visible: true,
  },
  {
    id: "custom-calligraphy",
    badge: "客製",
    name: "客製書法小作品",
    description: "把你想收藏的一句話，寫成可裱框、可送禮的手寫作品。",
    price: "880",
    priceLabel: "NT$ 880 起",
    mediaClass: "media-custom",
    url: "",
    visible: true,
  },
];

const siteDefaults = {
  heroEyebrow: "閱讀・手寫・書法・思考",
  heroTitle: "把讀過的句子，寫成陪伴自己的日常。",
  heroSubtitle: "從字帖、筆記本到療癒文字卡，為喜歡閱讀與手寫的人，準備安靜而有溫度的作品。",
  primaryCta: "選購商品",
  secondaryCta: "客製詢問",
  heroFontFamily: '"Noto Serif TC", "Microsoft JhengHei", "PingFang TC", serif',
  heroTitleSize: "49",
  heroSubtitleSize: "20",
  heroParagraphGap: "22",
  orderFormUrl: "",
  contactUrl: "",
  products: defaultProducts,
};
const storageKey = "handwriting-reading-site-settings";
const cart = [];

const cartPanel = document.querySelector("[data-cart-panel]");
const cartItems = document.querySelector("[data-cart-items]");
const cartCount = document.querySelector("[data-cart-count]");
const cartTotal = document.querySelector("[data-cart-total]");
const formStatus = document.querySelector("[data-form-status]");
const productsGrid = document.querySelector("[data-products-grid]");
const formLink = document.querySelector("[data-form-link]");

function readLocalSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return { ...siteDefaults, ...saved, products: saved?.products || defaultProducts };
  } catch {
    return siteDefaults;
  }
}

async function readSettings() {
  try {
    const response = await fetch("/api/site-settings", { cache: "no-store" });
    if (response.ok) {
      const remote = await response.json();
      if (remote) {
        localStorage.setItem(storageKey, JSON.stringify(remote));
        return { ...siteDefaults, ...remote, products: remote.products || defaultProducts };
      }
    }
  } catch {
    // Local file previews do not have Netlify Functions.
  }

  return readLocalSettings();
}

function formatPrice(value) {
  return `NT$ ${Number(value || 0).toLocaleString("zh-TW")}`;
}

function applySiteSettings(settings) {
  document.querySelectorAll("[data-site-field]").forEach((element) => {
    const value = settings[element.dataset.siteField];
    if (value) element.textContent = value;
  });

  const heroContent = document.querySelector(".hero-content");
  heroContent.style.fontFamily = settings.heroFontFamily;
  heroContent.style.setProperty("--hero-title-size", `${settings.heroTitleSize}px`);
  heroContent.style.setProperty("--hero-subtitle-size", `${settings.heroSubtitleSize}px`);
  heroContent.style.setProperty("--hero-paragraph-gap", `${settings.heroParagraphGap}px`);

  if (settings.contactUrl) {
    document.querySelector('[data-site-field="secondaryCta"]').setAttribute("href", settings.contactUrl);
  }

  if (settings.orderFormUrl) {
    formLink.href = settings.orderFormUrl;
    formLink.hidden = false;
  } else {
    formLink.hidden = true;
  }
}

function renderProducts(settings) {
  const visibleProducts = settings.products.filter((product) => product.visible !== false);
  productsGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-media ${product.mediaClass || "media-ink"}">
            <span>${product.badge || "商品"}</span>
          </div>
          <div class="product-body">
            <h3>${product.name || "未命名商品"}</h3>
            <p>${product.description || ""}</p>
            <div class="product-meta">
              <strong>${product.priceLabel || formatPrice(product.price)}</strong>
              <button
                type="button"
                data-add-cart
                data-name="${product.name || "未命名商品"}"
                data-price="${product.price || 0}"
                data-url="${product.url || ""}"
              >${product.url ? "購買" : "加入"}</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  document.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.url) {
        window.open(button.dataset.url, "_blank", "noreferrer");
        return;
      }

      cart.push({
        name: button.dataset.name,
        price: Number(button.dataset.price),
      });
      renderCart();
      openCart();
    });
  });
}

function renderCart() {
  cartCount.textContent = cart.length;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">尚未加入商品。</p>';
    cartTotal.textContent = "NT$ 0";
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartItems.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
          <strong>${item.name}</strong>
          <span>${formatPrice(item.price)}</span>
        </div>
      `
    )
    .join("");
  cartTotal.textContent = formatPrice(total);
}

function openCart() {
  cartPanel.classList.add("is-open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartPanel.classList.remove("is-open");
  cartPanel.setAttribute("aria-hidden", "true");
}

async function initSite() {
  const settings = await readSettings();
  applySiteSettings(settings);
  renderProducts(settings);
  renderCart();

  document.querySelector("[data-order-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selected = cart.length
      ? cart.map((item) => `・${item.name} ${formatPrice(item.price)}`).join("\n")
      : "尚未透過購物車選取商品";

    const message = [
      "訂購詢問已整理：",
      `姓名：${data.get("name")}`,
      `Email：${data.get("email")}`,
      "購物車：",
      selected,
      "備註：",
      data.get("message"),
    ].join("\n");

    navigator.clipboard?.writeText(message).catch(() => {});

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          items: cart,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        formStatus.textContent = `已送出訂購詢問，編號 #${result.orderId}。`;
        event.currentTarget.reset();
        return;
      }
    } catch {
      // Local file previews do not have Netlify Functions.
    }

    formStatus.textContent = settings.orderFormUrl
      ? "已產生訂購訊息。也可以點下方正式訂購表單送出。"
      : "已產生訂購訊息，並嘗試複製到剪貼簿。";
  });
}

document.querySelector("[data-cart-toggle]").addEventListener("click", openCart);
document.querySelector("[data-cart-close]").addEventListener("click", closeCart);
document.querySelector("[data-cart-close-link]").addEventListener("click", closeCart);
initSite();
