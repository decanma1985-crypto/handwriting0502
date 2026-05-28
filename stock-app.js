const storageKey = "tw-stock-watchlist";
const form = document.querySelector("[data-stock-form]");
const list = document.querySelector("[data-stock-list]");
const calcFields = {
  buy: document.querySelector("[data-calc-buy]"),
  sell: document.querySelector("[data-calc-sell]"),
  shares: document.querySelector("[data-calc-shares]"),
  dividend: document.querySelector("[data-calc-dividend]"),
  result: document.querySelector("[data-calc-result]"),
};

let editingId = null;
let stocks = readStocks();

function readStocks() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveStocks() {
  localStorage.setItem(storageKey, JSON.stringify(stocks));
}

function money(value) {
  return `NT$ ${Math.round(Number(value || 0)).toLocaleString("zh-TW")}`;
}

function numberValue(value) {
  return Number(value || 0);
}

function getDecision(stock) {
  if (stock.currentPrice && stock.buyBelow && stock.currentPrice <= stock.buyBelow) {
    return { label: "買進觀察", type: "buy" };
  }
  if (stock.currentPrice && stock.sellAbove && stock.currentPrice >= stock.sellAbove) {
    return { label: "賣出觀察", type: "sell" };
  }
  return { label: "持續追蹤", type: "watch" };
}

function estimateProfit(stock) {
  const cost = stock.avgCost * stock.shares;
  const market = stock.currentPrice * stock.shares;
  return market - cost;
}

function estimateTargetProfit(stock) {
  const sellPrice = stock.targetPrice || stock.sellAbove || stock.currentPrice;
  const gross = (sellPrice - stock.avgCost) * stock.shares;
  const fee = (stock.avgCost * stock.shares + sellPrice * stock.shares) * 0.001425;
  const tax = sellPrice * stock.shares * 0.003;
  const dividend = stock.cashDividend * stock.shares;
  return gross + dividend - fee - tax;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / 86400000);
}

function renderSummary() {
  const totalCost = stocks.reduce((sum, stock) => sum + stock.avgCost * stock.shares, 0);
  const marketValue = stocks.reduce((sum, stock) => sum + stock.currentPrice * stock.shares, 0);
  const dividend = stocks.reduce((sum, stock) => sum + stock.cashDividend * stock.shares, 0);
  document.querySelector("[data-total-cost]").textContent = money(totalCost);
  document.querySelector("[data-market-value]").textContent = money(marketValue);
  const profit = marketValue - totalCost;
  const profitElement = document.querySelector("[data-unrealized-profit]");
  profitElement.textContent = money(profit);
  profitElement.className = profit >= 0 ? "positive" : "negative";
  document.querySelector("[data-dividend-income]").textContent = money(dividend);
}

function reminderText(label, dateValue) {
  const days = daysUntil(dateValue);
  if (days === null) return "";
  if (days < 0) return `${label}：${dateValue}（已過 ${Math.abs(days)} 天）`;
  if (days === 0) return `${label}：${dateValue}（今天）`;
  return `${label}：${dateValue}（剩 ${days} 天）`;
}

async function loadNews(stock, container) {
  container.innerHTML = "<li>讀取最新消息中...</li>";
  try {
    const params = new URLSearchParams({ symbol: stock.symbol, name: stock.name });
    const response = await fetch(`/api/stock-news?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("news failed");
    const data = await response.json();
    const items = data.items || [];
    container.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <li>
                <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
                <small>${item.source || "Google News"}｜${item.publishedAt || ""}</small>
              </li>
            `
          )
          .join("")
      : "<li>目前沒有讀到相關消息。</li>";
  } catch {
    container.innerHTML = '<li>暫時無法讀取消息，請稍後再試。</li>';
  }
}

function renderStocks() {
  renderSummary();
  if (stocks.length === 0) {
    list.innerHTML = '<div class="empty-state">尚未新增自選股。先把股票代號、買進價、賣出價和配息日填進左側表單。</div>';
    return;
  }

  list.innerHTML = stocks
    .map((stock) => {
      const decision = getDecision(stock);
      const unrealized = estimateProfit(stock);
      const targetProfit = estimateTargetProfit(stock);
      const reminders = [
        reminderText("配息日", stock.cashDividendDate),
        reminderText("配股日", stock.stockDividendDate),
      ].filter(Boolean);

      return `
        <article class="stock-card" data-stock-card="${stock.id}">
          <div class="stock-top">
            <div>
              <h3>${stock.symbol} ${stock.name}</h3>
              <p>${stock.note || "尚未填寫觀察重點"}</p>
            </div>
            <span class="badge ${decision.type}">${decision.label}</span>
          </div>
          <div class="stock-meta">
            <div><span>持有股數</span><strong>${stock.shares.toLocaleString("zh-TW")}</strong></div>
            <div><span>平均成本</span><strong>${money(stock.avgCost)}</strong></div>
            <div><span>目前價格</span><strong>${money(stock.currentPrice)}</strong></div>
            <div><span>未實現</span><strong class="${unrealized >= 0 ? "positive" : "negative"}">${money(unrealized)}</strong></div>
            <div><span>買進觀察</span><strong>${money(stock.buyBelow)}</strong></div>
            <div><span>賣出觀察</span><strong>${money(stock.sellAbove)}</strong></div>
            <div><span>目標價損益</span><strong class="${targetProfit >= 0 ? "positive" : "negative"}">${money(targetProfit)}</strong></div>
            <div><span>預估股利</span><strong>${money(stock.cashDividend * stock.shares)}</strong></div>
          </div>
          <ul class="reminder-list">
            ${reminders.length ? reminders.map((item) => `<li>${item}</li>`).join("") : "<li>尚未設定配股配息提醒。</li>"}
          </ul>
          <ul class="news-list" data-news-list="${stock.id}">
            <li>尚未讀取最新消息。</li>
          </ul>
          <div class="card-actions">
            <button type="button" data-edit="${stock.id}">編輯</button>
            <button type="button" class="secondary" data-news="${stock.id}">讀取最新消息</button>
            <button type="button" class="secondary" data-delete="${stock.id}">刪除</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function fillForm(stock) {
  editingId = stock.id;
  Object.entries(stock).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  form.querySelector("button[type='submit']").textContent = "更新標的";
}

function resetForm() {
  editingId = null;
  form.reset();
  form.elements.shares.value = 0;
  form.elements.avgCost.value = 0;
  form.elements.currentPrice.value = 0;
  form.elements.buyBelow.value = 0;
  form.elements.sellAbove.value = 0;
  form.elements.targetPrice.value = 0;
  form.elements.cashDividend.value = 0;
  form.elements.stockDividend.value = 0;
  form.querySelector("button[type='submit']").textContent = "儲存標的";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const stock = {
    id: editingId || `${Date.now()}`,
    symbol: String(data.get("symbol")).trim(),
    name: String(data.get("name")).trim(),
    shares: numberValue(data.get("shares")),
    avgCost: numberValue(data.get("avgCost")),
    currentPrice: numberValue(data.get("currentPrice")),
    buyBelow: numberValue(data.get("buyBelow")),
    sellAbove: numberValue(data.get("sellAbove")),
    targetPrice: numberValue(data.get("targetPrice")),
    cashDividend: numberValue(data.get("cashDividend")),
    stockDividend: numberValue(data.get("stockDividend")),
    cashDividendDate: String(data.get("cashDividendDate") || ""),
    stockDividendDate: String(data.get("stockDividendDate") || ""),
    note: String(data.get("note") || "").trim(),
  };

  stocks = editingId ? stocks.map((item) => (item.id === editingId ? stock : item)) : [stock, ...stocks];
  saveStocks();
  resetForm();
  renderStocks();
});

document.querySelector("[data-reset-form]").addEventListener("click", resetForm);

list.addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  const newsId = event.target.dataset.news;

  if (editId) {
    const stock = stocks.find((item) => item.id === editId);
    if (stock) fillForm(stock);
  }

  if (deleteId) {
    stocks = stocks.filter((item) => item.id !== deleteId);
    saveStocks();
    renderStocks();
  }

  if (newsId) {
    const stock = stocks.find((item) => item.id === newsId);
    const container = document.querySelector(`[data-news-list="${newsId}"]`);
    if (stock && container) loadNews(stock, container);
  }
});

function updateCalculator() {
  const buy = numberValue(calcFields.buy.value);
  const sell = numberValue(calcFields.sell.value);
  const shares = numberValue(calcFields.shares.value);
  const dividend = numberValue(calcFields.dividend.value);
  const buyCost = buy * shares;
  const sellValue = sell * shares;
  const fee = (buyCost + sellValue) * 0.001425;
  const tax = sellValue * 0.003;
  const result = sellValue - buyCost + dividend - fee - tax;
  calcFields.result.textContent = money(result);
  calcFields.result.className = result >= 0 ? "positive" : "negative";
}

Object.values(calcFields).forEach((field) => {
  if (field.tagName === "INPUT") field.addEventListener("input", updateCalculator);
});

document.querySelector("[data-export]").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(stocks, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tw-stock-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

renderStocks();
updateCalculator();
