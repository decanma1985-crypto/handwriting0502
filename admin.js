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
const form = document.querySelector("[data-admin-form]");
const statusText = document.querySelector("[data-admin-status]");
const productsEditor = document.querySelector("[data-products-editor]");
const ordersList = document.querySelector("[data-orders-list]");

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
    const response = await fetch("/api/site-settings", { cache: "no-store", credentials: "include" });
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

function updateOutputs() {
  document.querySelectorAll("[data-output-for]").forEach((output) => {
    const field = form.elements[output.dataset.outputFor];
    if (!field) return;
    output.value = `${field.value}px`;
  });
}

function getCurrentSettings() {
  return {
    ...siteDefaults,
    ...Object.fromEntries(new FormData(form).entries()),
    products: collectProducts(),
  };
}

function updatePreview() {
  const settings = getCurrentSettings();
  document.querySelectorAll("[data-preview-field]").forEach((element) => {
    element.textContent = settings[element.dataset.previewField] || "";
  });

  const preview = document.querySelector(".admin-preview");
  preview.style.fontFamily = settings.heroFontFamily;
  preview.style.gap = `${settings.heroParagraphGap}px`;
  preview.querySelector("h2").style.fontSize = `${settings.heroTitleSize}px`;
  preview.querySelector('p[data-preview-field="heroSubtitle"]').style.fontSize = `${settings.heroSubtitleSize}px`;
}

function renderProductsEditor(products) {
  productsEditor.innerHTML = products
    .map(
      (product, index) => `
        <article class="admin-product-item" data-product-row>
          <div class="admin-product-title">
            <strong>商品 ${index + 1}</strong>
            <label class="inline-check">
              <input type="checkbox" data-product-field="visible" ${product.visible !== false ? "checked" : ""} />
              上架到首頁
            </label>
          </div>
          <div class="admin-product-grid">
            <label>
              商品分類短字
              <input data-product-field="badge" value="${product.badge || ""}" />
            </label>
            <label>
              商品名稱
              <input data-product-field="name" value="${product.name || ""}" />
            </label>
            <label>
              售價數字
              <input data-product-field="price" type="number" min="0" value="${product.price || ""}" />
            </label>
            <label>
              價格顯示文字
              <input data-product-field="priceLabel" value="${product.priceLabel || ""}" />
            </label>
            <label>
              視覺樣式
              <select data-product-field="mediaClass">
                <option value="media-ink" ${product.mediaClass === "media-ink" ? "selected" : ""}>字帖墨色</option>
                <option value="media-book" ${product.mediaClass === "media-book" ? "selected" : ""}>閱讀筆記</option>
                <option value="media-card" ${product.mediaClass === "media-card" ? "selected" : ""}>療癒卡片</option>
                <option value="media-custom" ${product.mediaClass === "media-custom" ? "selected" : ""}>客製作品</option>
              </select>
            </label>
            <label>
              商品購買連結
              <input data-product-field="url" type="url" placeholder="https://..." value="${product.url || ""}" />
            </label>
            <label class="full-row">
              商品描述
              <textarea data-product-field="description" rows="3">${product.description || ""}</textarea>
            </label>
          </div>
          <button class="reset-button product-delete" type="button" data-product-delete>刪除商品</button>
        </article>
      `
    )
    .join("");
}

function collectProducts() {
  return [...document.querySelectorAll("[data-product-row]")].map((row, index) => {
    const product = { id: `product-${index + 1}` };
    row.querySelectorAll("[data-product-field]").forEach((field) => {
      if (field.dataset.productField === "visible") {
        product.visible = field.checked;
      } else {
        product[field.dataset.productField] = field.value.trim();
      }
    });
    return product;
  });
}

function fillForm(settings) {
  Object.entries(settings).forEach(([key, value]) => {
    if (key !== "products" && form.elements[key]) {
      form.elements[key].value = value;
    }
  });
  renderProductsEditor(settings.products);
  updateOutputs();
  updatePreview();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

form.addEventListener("input", () => {
  updateOutputs();
  updatePreview();
});

productsEditor.addEventListener("click", (event) => {
  if (!event.target.matches("[data-product-delete]")) return;
  event.target.closest("[data-product-row]").remove();
  updatePreview();
});

document.querySelector("[data-product-add]").addEventListener("click", () => {
  const products = collectProducts();
  products.push({
    id: `product-${Date.now()}`,
    badge: "新品",
    name: "新商品",
    description: "請輸入商品描述。",
    price: "0",
    priceLabel: "NT$ 0",
    mediaClass: "media-ink",
    url: "",
    visible: true,
  });
  renderProductsEditor(products);
});

document.querySelector("[data-admin-reset]").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  fillForm(siteDefaults);
  statusText.textContent = "已恢復預設。";
});

async function loadOrders() {
  ordersList.innerHTML = '<p class="empty-cart">讀取訂單中...</p>';
  try {
    const response = await fetch("/api/orders", { credentials: "include", cache: "no-store" });
    if (!response.ok) {
      ordersList.innerHTML = '<p class="empty-cart">無法讀取訂單。請確認你已登入 admin 帳號。</p>';
      return;
    }

    const data = await response.json();
    const orders = data.orders || [];
    if (orders.length === 0) {
      ordersList.innerHTML = '<p class="empty-cart">目前尚無訂單。</p>';
      return;
    }

    ordersList.innerHTML = orders
      .map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        return `
          <article class="admin-order-item">
            <div>
              <strong>#${order.id} ${order.customer_name}</strong>
              <span>${order.email}</span>
            </div>
            <p>${order.message || ""}</p>
            <ul>
              ${items.map((item) => `<li>${item.name} - NT$ ${Number(item.price || 0).toLocaleString("zh-TW")}</li>`).join("")}
            </ul>
            <small>${new Date(order.created_at).toLocaleString("zh-TW")}</small>
          </article>
        `;
      })
      .join("");
  } catch {
    ordersList.innerHTML = '<p class="empty-cart">本機預覽無法讀取雲端訂單，部署後即可使用。</p>';
  }
}

document.querySelector("[data-orders-refresh]").addEventListener("click", loadOrders);

async function saveSettings() {
  const settings = getCurrentSettings();
  localStorage.setItem(storageKey, JSON.stringify(settings));
  statusText.textContent = "儲存中...";

  try {
    const response = await fetch("/api/site-settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      statusText.textContent = "已存到本機，但雲端儲存失敗。請確認你已登入且具備 admin 權限。";
      return;
    }

    statusText.textContent = "已儲存到網站後台。回到首頁重新整理後會套用。";
  } catch {
    statusText.textContent = "已存到本機。部署到 Netlify 後會改用雲端後台儲存。";
  }
}

async function initAdmin() {
  fillForm(await readSettings());
  loadOrders();
}

initAdmin();
