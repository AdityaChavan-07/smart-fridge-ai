/* ==========================================================================
   SMART FRIDGE AI — FRONTEND LOGIC & INTEGRATION
   ========================================================================== */

const API_BASE = window.SMART_FRIDGE_API_BASE || "http://localhost:8000";

// Application State
let activeInventory = [];
let restockAlerts = [];
let currentTab = "inventory";
let aiTextCycleInterval = null;

// AI Loading Screen Text Steps
const AI_STEPS = [
  "Analyzing ingredients...",
  "Finding flavor matches...",
  "Building recipes...",
  "Finalizing results..."
];

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
  setupTactileRipples();
  checkSystemStatus();
  loadInventory();
  loadRestockAlerts();
});

/* --------------------------------------------------------------------------
   API INTEGRATION & DASHBOARD DATA
   -------------------------------------------------------------------------- */

async function checkSystemStatus() {
  const statusBadge = document.getElementById("system-status");
  const statusText = statusBadge.querySelector(".status-text");

  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      statusBadge.classList.add("online");
      statusText.textContent = "Hub Online";
    } else {
      throw new Error();
    }
  } catch (err) {
    statusBadge.classList.remove("online");
    statusText.textContent = "Offline Mode";
  }
}

async function loadInventory() {
  renderInventorySkeletons();
  try {
    const res = await fetch(`${API_BASE}/api/items`);
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    activeInventory = await res.json();
    renderInventory();
    updateMetrics();
  } catch (err) {
    console.error("loadInventory Error:", err);
    showToast("Could not sync inventory", "error");
  }
}

async function loadRestockAlerts() {
  renderRestockSkeletons();
  try {
    const res = await fetch(`${API_BASE}/api/restock-alerts`);
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    restockAlerts = await res.json();
    renderRestockAlerts();
    updateMetrics();
  } catch (err) {
    console.error("loadRestockAlerts Error:", err);
  }
}

/* --------------------------------------------------------------------------
   UI RENDERING & ANIMATED STATES
   -------------------------------------------------------------------------- */

function renderInventorySkeletons() {
  const list = document.getElementById("inventory-list");
  list.innerHTML = Array(3).fill('<div class="skeleton"></div>').join("");
}

function renderRestockSkeletons() {
  const list = document.getElementById("restock-list");
  list.innerHTML = Array(2).fill('<div class="skeleton"></div>').join("");
}

function renderInventory() {
  const list = document.getElementById("inventory-list");
  const countBadge = document.getElementById("inventory-count-badge");
  countBadge.textContent = `${activeInventory.length} items`;

  if (activeInventory.length === 0) {
    list.innerHTML = `<div class="fallback"><p>Fridge is empty. Add items above!</p></div>`;
    return;
  }

  list.innerHTML = activeInventory
    .map(
      (item, index) => `
    <div class="item-card" id="inventory-item-${item.id}" style="animation-delay: ${index * 40}ms">
      <div class="item-info">
        <span class="item-name">${escapeHtml(item.item_name)}</span>
        <span class="item-meta">Velocity: ${item.weekly_velocity || 1}/wk</span>
      </div>
      <div class="item-actions">
        <div class="qty-controls">
          <button class="qty-btn" onclick="adjustVelocity(${item.id}, ${(item.weekly_velocity || 1) - 1})">-</button>
          <span class="qty-val">x${item.quantity}</span>
          <button class="qty-btn" onclick="adjustVelocity(${item.id}, ${(item.weekly_velocity || 1) + 1})">+</button>
        </div>
        <button class="btn-icon" onclick="deleteItem(${item.id})" title="Remove item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

function renderRestockAlerts() {
  const list = document.getElementById("restock-list");

  if (!restockAlerts || restockAlerts.length === 0) {
    list.innerHTML = `<div class="fallback"><p>✓ All essential stock levels healthy</p></div>`;
    return;
  }

  list.innerHTML = restockAlerts
    .map(
      (alert, index) => `
    <div class="item-card" style="animation-delay: ${index * 40}ms; border-left: 4px solid var(--danger);">
      <div class="item-info">
        <span class="item-name">${escapeHtml(alert.item_name)}</span>
        <span class="item-meta" style="color: var(--danger)">Estimated ${alert.days_remaining} day(s) left</span>
      </div>
      <button class="btn btn-secondary" onclick="quickReorder('${escapeHtml(alert.item_name)}')">
        + Restock
      </button>
    </div>
  `
    )
    .join("");
}

function updateMetrics() {
  animateCounter("stat-total-items", activeInventory.length);
  animateCounter("stat-low-stock", restockAlerts.length);
}

/* --------------------------------------------------------------------------
   ITEM ACTIONS (CRUD)
   -------------------------------------------------------------------------- */

function filterOrAddItems() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const box = document.getElementById("results-box");

  if (!query) {
    box.innerHTML = "";
    return;
  }

  const matches = activeInventory.filter((i) =>
    i.item_name.toLowerCase().includes(query)
  );

  if (matches.length > 0) {
    box.innerHTML = matches
      .map(
        (i) => `<div class="item-result">✓ In Fridge: <strong>${escapeHtml(i.item_name)}</strong> (x${i.quantity})</div>`
      )
      .join("");
  } else {
    const safeQuery = escapeHtml(query);
    box.innerHTML = `
      <div class="fallback">
        <p>No item "${safeQuery}" found.</p>
        <button class="btn btn-primary" style="margin-top: 8px;" onclick="addManualItem('${safeQuery.replace(/'/g, "\\'")}')">
          + Add "${safeQuery}"
        </button>
      </div>
    `;
  }
}

async function addManualItem(name, qty = 1) {
  try {
    const res = await fetch(`${API_BASE}/api/add-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_name: name, quantity: qty }),
    });

    if (!res.ok) throw new Error(`Add item failed (${res.status})`);
    
    showToast(`Added ${name} to fridge`, "success");
    document.getElementById("search-input").value = "";
    document.getElementById("results-box").innerHTML = "";
    closeAddModal();
    await loadInventory();
    await loadRestockAlerts();
  } catch (err) {
    console.error(err);
    showToast("Could not add item", "error");
  }
}

async function deleteItem(id) {
  const itemEl = document.getElementById(`inventory-item-${id}`);
  if (itemEl) itemEl.classList.add("deleting");

  setTimeout(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Item removed", "success");
      await loadInventory();
      await loadRestockAlerts();
    } catch (err) {
      showToast("Failed to remove item", "error");
      if (itemEl) itemEl.classList.remove("deleting");
    }
  }, 300);
}

async function adjustVelocity(id, newVelocity) {
  if (newVelocity < 1) newVelocity = 1;
  try {
    const res = await fetch(`${API_BASE}/api/items/${id}/velocity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekly_velocity: newVelocity }),
    });
    if (!res.ok) throw new Error();
    await loadInventory();
    await loadRestockAlerts();
  } catch (err) {
    showToast("Could not update velocity", "error");
  }
}

function quickReorder(itemName) {
  addManualItem(itemName, 1);
}

/* --------------------------------------------------------------------------
   AI RECIPE GENERATION EXPERIENCE
   -------------------------------------------------------------------------- */

async function generateRecipe() {
  const btn = document.getElementById("generate-recipe-btn");
  const loadingPanel = document.getElementById("ai-loading-panel");
  const recipeCard = document.getElementById("recipe-card-container");
  const recipeOutput = document.getElementById("recipe-output");
  const videoEmbed = document.getElementById("video-embed");

  const names = activeInventory.map((i) => i.item_name);
  if (names.length === 0) {
    showToast("Add some items to your inventory first", "error");
    return;
  }

  // Set Loading UI State
  btn.disabled = true;
  recipeCard.classList.add("hidden");
  loadingPanel.classList.remove("hidden");
  startAITextCycle();

  try {
    const res = await fetch(`${API_BASE}/api/generate-recipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventory: names }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Recipe failed (${res.status})`);
    }

    const data = await res.json();

    // Render Data
    recipeOutput.textContent = data.recipe;
    if (data.youtube_video_id) {
      videoEmbed.innerHTML = `<iframe src="https://www.youtube.com/embed/${data.youtube_video_id}" allowfullscreen></iframe>`;
    } else {
      videoEmbed.innerHTML = "";
    }

    // Reveal Result
    loadingPanel.classList.add("hidden");
    recipeCard.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
    loadingPanel.classList.add("hidden");
  } finally {
    btn.disabled = false;
    stopAITextCycle();
  }
}

function startAITextCycle() {
  const statusEl = document.getElementById("ai-status-text");
  let step = 0;
  statusEl.textContent = AI_STEPS[0];
  
  aiTextCycleInterval = setInterval(() => {
    step = (step + 1) % AI_STEPS.length;
    statusEl.style.opacity = "0";
    setTimeout(() => {
      statusEl.textContent = AI_STEPS[step];
      statusEl.style.opacity = "1";
    }, 150);
  }, 1200);
}

function stopAITextCycle() {
  if (aiTextCycleInterval) clearInterval(aiTextCycleInterval);
}

/* --------------------------------------------------------------------------
   TAB NAVIGATION & MODAL CONTROLS
   -------------------------------------------------------------------------- */

function switchTab(tabId, tabEl) {
  currentTab = tabId;

  document.querySelectorAll(".tab-view").forEach((view) => {
    view.classList.remove("active");
  });
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.getElementById(`view-${tabId}`).classList.add("active");
  tabEl.classList.add("active");

  // Move Sliding Pill
  const indicator = document.getElementById("nav-indicator");
  const tabIndex = Array.from(tabEl.parentNode.children).indexOf(tabEl);
  indicator.style.transform = `translateX(${tabIndex * 100}%)`;
}

function openAddModal() {
  document.getElementById("add-modal").classList.add("open");
}

function closeAddModal() {
  document.getElementById("add-modal").classList.remove("open");
}

function closeAddModalOnBackdrop(e) {
  if (e.target.classList.contains("modal-backdrop")) closeAddModal();
}

function handleManualSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("modal-item-name").value.trim();
  const qty = parseInt(document.getElementById("modal-item-qty").value, 10) || 1;
  if (name) addManualItem(name, qty);
}

/* --------------------------------------------------------------------------
   ANIMATIONS & MICRO-INTERACTIONS
   -------------------------------------------------------------------------- */

function setupTactileRipples() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest(".btn");
    if (!target) return;

    const circle = document.createElement("span");
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;

    const rect = target.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add("ripple");

    const ripple = target.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();

    target.appendChild(circle);
  });
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✓" : "✕"}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 300ms var(--easing) forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function animateCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  const startValue = parseInt(el.textContent, 10) || 0;
  if (startValue === targetValue) return;

  const duration = 400;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
    el.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = targetValue;
    }
  }

  requestAnimationFrame(update);
}

function copyRecipeText() {
  const text = document.getElementById("recipe-output").textContent;
  if (!text) return;
  navigator.clipboard.writeText(text);
  showToast("Recipe copied to clipboard", "success");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}