/* ==========================================================================
   SMART FRIDGE AI — FRONTEND LOGIC & INTEGRATION
   ========================================================================== */

const API_BASE =
  window.SMART_FRIDGE_API_BASE || "http://localhost:8000";


// ==========================================================================
// APPLICATION STATE
// ==========================================================================

let activeInventory = [];
let restockAlerts = [];
let currentTab = "inventory";
let aiTextCycleInterval = null;


// ==========================================================================
// AI LOADING SCREEN TEXT
// ==========================================================================

const AI_STEPS = [
  "Analyzing ingredients...",
  "Finding flavor matches...",
  "Building recipes...",
  "Finalizing results..."
];


// ==========================================================================
// INITIALIZE DASHBOARD
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  setupTactileRipples();
  checkSystemStatus();
  loadInventory();
  loadRestockAlerts();
});


// ==========================================================================
// API INTEGRATION & DASHBOARD DATA
// ==========================================================================

async function checkSystemStatus() {
  const statusBadge = document.getElementById("system-status");

  if (!statusBadge) {
    return;
  }

  const statusText = statusBadge.querySelector(".status-text");

  try {
    const res = await fetch(`${API_BASE}/health`);

    if (res.ok) {
      statusBadge.classList.add("online");

      if (statusText) {
        statusText.textContent = "Hub Online";
      }
    } else {
      throw new Error();
    }
  } catch (err) {
    statusBadge.classList.remove("online");

    if (statusText) {
      statusText.textContent = "Offline Mode";
    }
  }
}


// ==========================================================================
// LOAD INVENTORY
// ==========================================================================

async function loadInventory() {
  renderInventorySkeletons();

  try {
    const res = await fetch(`${API_BASE}/api/items`);

    if (!res.ok) {
      throw new Error(`Failed (${res.status})`);
    }

    activeInventory = await res.json();

    renderInventory();
    updateMetrics();

  } catch (err) {
    console.error("loadInventory Error:", err);
    showToast("Could not sync inventory", "error");
  }
}


// ==========================================================================
// LOAD RESTOCK ALERTS
// ==========================================================================

async function loadRestockAlerts() {
  renderRestockSkeletons();

  try {
    const res = await fetch(`${API_BASE}/api/restock-alerts`);

    if (!res.ok) {
      throw new Error(`Failed (${res.status})`);
    }

    restockAlerts = await res.json();

    renderRestockAlerts();
    updateMetrics();

  } catch (err) {
    console.error("loadRestockAlerts Error:", err);
  }
}


// ==========================================================================
// UI SKELETONS
// ==========================================================================

function renderInventorySkeletons() {
  const list = document.getElementById("inventory-list");

  if (!list) {
    return;
  }

  list.innerHTML = Array(3)
    .fill('<div class="skeleton"></div>')
    .join("");
}


function renderRestockSkeletons() {
  const list = document.getElementById("restock-list");

  if (!list) {
    return;
  }

  list.innerHTML = Array(2)
    .fill('<div class="skeleton"></div>')
    .join("");
}


// ==========================================================================
// RENDER INVENTORY
// ==========================================================================

function renderInventory() {
  const list = document.getElementById("inventory-list");
  const countBadge = document.getElementById(
    "inventory-count-badge"
  );

  if (!list) {
    return;
  }

  if (countBadge) {
    countBadge.textContent =
      `${activeInventory.length} items`;
  }

  if (activeInventory.length === 0) {
    list.innerHTML = `
      <div class="fallback">
        <p>Fridge is empty. Add items above!</p>
      </div>
    `;

    return;
  }


  list.innerHTML = activeInventory
    .map(
      (item, index) => {

        const velocity =
          Number(item.weekly_velocity) || 1;

        const quantity =
          Number(item.quantity) || 0;

        return `
          <div
            class="item-card"
            id="inventory-item-${item.id}"
            style="animation-delay: ${index * 40}ms"
          >

            <div class="item-info">

              <span class="item-name">
                ${escapeHtml(item.item_name)}
              </span>

              <span class="item-meta">
                Stock: ${quantity}
              </span>

              <span class="item-meta">
                Velocity: ${velocity}/wk
              </span>

            </div>


            <div class="item-actions">

              <!-- =====================================================
                   WEEKLY VELOCITY CONTROLS
                   ===================================================== -->

              <div class="qty-controls">

                <button
                  class="qty-btn"
                  onclick="adjustVelocity(
                    ${item.id},
                    ${Math.max(1, velocity - 1)}
                  )"
                  title="Decrease weekly velocity"
                >
                  -
                </button>

                <span class="qty-val">
                  ${velocity}
                </span>

                <button
                  class="qty-btn"
                  onclick="adjustVelocity(
                    ${item.id},
                    ${velocity + 1}
                  )"
                  title="Increase weekly velocity"
                >
                  +
                </button>

              </div>


              <!-- =====================================================
                   CONSUME ONE ITEM
                   ===================================================== -->

              <button
                class="btn btn-secondary"
                onclick="consumeItem(${item.id}, 1)"
                ${quantity <= 0 ? "disabled" : ""}
              >
                Take 1
              </button>


              <!-- =====================================================
                   CONSUME CUSTOM AMOUNT
                   ===================================================== -->

              <button
                class="btn btn-secondary"
                onclick="consumeCustomItem(${item.id})"
                ${quantity <= 0 ? "disabled" : ""}
              >
                Take
              </button>


              <!-- =====================================================
                   DELETE ITEM
                   ===================================================== -->

              <button
                class="btn-icon"
                onclick="deleteItem(${item.id})"
                title="Remove item"
              >

                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="3 6 5 6 21 6"/>
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                  />
                  <path
                    d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                  />
                </svg>

              </button>

            </div>

          </div>
        `;
      }
    )
    .join("");
}


// ==========================================================================
// RENDER RESTOCK ALERTS
// ==========================================================================

function renderRestockAlerts() {
  const list = document.getElementById("restock-list");

  if (!list) {
    return;
  }

  if (!restockAlerts || restockAlerts.length === 0) {

    list.innerHTML = `
      <div class="fallback">
        <p>✓ All essential stock levels healthy</p>
      </div>
    `;

    return;
  }


  list.innerHTML = restockAlerts
    .map(
      (alert, index) => `
        <div
          class="item-card"
          style="
            animation-delay: ${index * 40}ms;
            border-left: 4px solid var(--danger);
          "
        >

          <div class="item-info">

            <span class="item-name">
              ${escapeHtml(alert.item_name)}
            </span>

            <span
              class="item-meta"
              style="color: var(--danger)"
            >
              Estimated ${alert.days_remaining} day(s) left
            </span>

          </div>


          <button
            class="btn btn-secondary"
            onclick="quickReorder('${escapeHtml(alert.item_name)}')"
          >
            + Restock
          </button>

        </div>
      `
    )
    .join("");
}


// ==========================================================================
// METRICS
// ==========================================================================

function updateMetrics() {
  animateCounter(
    "stat-total-items",
    activeInventory.length
  );

  animateCounter(
    "stat-low-stock",
    restockAlerts.length
  );
}


// ==========================================================================
// SEARCH / ADD ITEMS
// ==========================================================================

function filterOrAddItems() {
  const input =
    document.getElementById("search-input");

  const box =
    document.getElementById("results-box");

  if (!input || !box) {
    return;
  }

  const query =
    input.value.trim().toLowerCase();

  if (!query) {
    box.innerHTML = "";
    return;
  }


  const matches = activeInventory.filter((i) =>
    i.item_name
      .toLowerCase()
      .includes(query)
  );


  if (matches.length > 0) {

    box.innerHTML = matches
      .map(
        (i) => `
          <div class="item-result">
            ✓ In Fridge:
            <strong>
              ${escapeHtml(i.item_name)}
            </strong>
            (x${i.quantity})
          </div>
        `
      )
      .join("");

  } else {

    const safeQuery =
      escapeHtml(query);

    box.innerHTML = `
      <div class="fallback">

        <p>
          No item "${safeQuery}" found.
        </p>

        <button
          class="btn btn-primary"
          style="margin-top: 8px;"
          onclick="addManualItem(
            '${safeQuery.replace(/'/g, "\\'")}'
          )"
        >
          + Add "${safeQuery}"
        </button>

      </div>
    `;
  }
}


// ==========================================================================
// ADD ITEM
// ==========================================================================

async function addManualItem(name, qty = 1) {
  try {

    const res = await fetch(
      `${API_BASE}/api/add-item`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          item_name: name,
          quantity: qty
        })
      }
    );


    const data = await res.json().catch(() => ({}));


    if (!res.ok) {
      throw new Error(
        data.detail ||
        `Add item failed (${res.status})`
      );
    }


    showToast(
      `Added ${name} to fridge`,
      "success"
    );


    const searchInput =
      document.getElementById("search-input");

    const resultsBox =
      document.getElementById("results-box");

    if (searchInput) {
      searchInput.value = "";
    }

    if (resultsBox) {
      resultsBox.innerHTML = "";
    }


    closeAddModal();


    await loadInventory();
    await loadRestockAlerts();

  } catch (err) {

    console.error(
      "addManualItem Error:",
      err
    );

    showToast(
      err.message || "Could not add item",
      "error"
    );
  }
}


// ==========================================================================
// CONSUME ITEM
// ==========================================================================

async function consumeItem(id, quantity = 1) {

  const item =
    activeInventory.find(
      (item) => item.id === id
    );


  if (!item) {
    showToast(
      "Item not found",
      "error"
    );

    return;
  }


  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast(
      "Quantity must be at least 1",
      "error"
    );

    return;
  }


  if (quantity > item.quantity) {

    showToast(
      `Only ${item.quantity} ${item.item_name} available`,
      "error"
    );

    return;
  }


  try {

    const res = await fetch(
      `${API_BASE}/api/items/${id}/consume`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          quantity: quantity
        })
      }
    );


    const data =
      await res.json().catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.detail ||
        `Could not consume item (${res.status})`
      );
    }


    showToast(
      `Used ${quantity} ${item.item_name}. ${data.quantity} remaining.`,
      "success"
    );


    // Refresh database state.
    await loadInventory();

    // Refresh predictive restock state.
    await loadRestockAlerts();

  } catch (err) {

    console.error(
      "consumeItem Error:",
      err
    );

    showToast(
      err.message ||
      "Could not update inventory",
      "error"
    );
  }
}


// ==========================================================================
// CONSUME CUSTOM QUANTITY
// ==========================================================================

async function consumeCustomItem(id) {

  const item =
    activeInventory.find(
      (item) => item.id === id
    );


  if (!item) {
    showToast(
      "Item not found",
      "error"
    );

    return;
  }


  if (item.quantity <= 0) {

    showToast(
      `${item.item_name} is out of stock`,
      "error"
    );

    return;
  }


  const input = prompt(
    `How many ${item.item_name} did you take?\n\nAvailable: ${item.quantity}`,
    "1"
  );


  if (input === null) {
    return;
  }


  const quantity =
    Number(input);


  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {

    showToast(
      "Enter a valid whole number",
      "error"
    );

    return;
  }


  if (quantity > item.quantity) {

    showToast(
      `Only ${item.quantity} ${item.item_name} available`,
      "error"
    );

    return;
  }


  await consumeItem(
    id,
    quantity
  );
}


// ==========================================================================
// DELETE ITEM
// ==========================================================================

async function deleteItem(id) {

  const itemEl =
    document.getElementById(
      `inventory-item-${id}`
    );


  if (itemEl) {
    itemEl.classList.add("deleting");
  }


  setTimeout(async () => {

    try {

      const res = await fetch(
        `${API_BASE}/api/items/${id}`,
        {
          method: "DELETE"
        }
      );


      const data =
        await res.json().catch(() => ({}));


      if (!res.ok) {

        throw new Error(
          data.detail ||
          `Delete failed (${res.status})`
        );
      }


      showToast(
        "Item removed",
        "success"
      );


      await loadInventory();
      await loadRestockAlerts();

    } catch (err) {

      console.error(
        "deleteItem Error:",
        err
      );

      showToast(
        err.message ||
        "Failed to remove item",
        "error"
      );


      if (itemEl) {
        itemEl.classList.remove(
          "deleting"
        );
      }
    }

  }, 300);
}


// ==========================================================================
// UPDATE WEEKLY VELOCITY
// ==========================================================================

async function adjustVelocity(
  id,
  newVelocity
) {

  if (newVelocity < 1) {
    newVelocity = 1;
  }


  try {

    const res = await fetch(
      `${API_BASE}/api/items/${id}/velocity`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          weekly_velocity: newVelocity
        })
      }
    );


    const data =
      await res.json().catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.detail ||
        `Velocity update failed (${res.status})`
      );
    }


    await loadInventory();
    await loadRestockAlerts();

  } catch (err) {

    console.error(
      "adjustVelocity Error:",
      err
    );

    showToast(
      err.message ||
      "Could not update velocity",
      "error"
    );
  }
}


// ==========================================================================
// QUICK REORDER
// ==========================================================================

function quickReorder(itemName) {
  addManualItem(
    itemName,
    1
  );
}

// ==========================================================================
// INSTANT GROCERY ORDER APPS
// ==========================================================================

function openGroceryApp(app) {

  const groceryApps = {

    blinkit: "https://blinkit.com/",

    zepto: "https://www.zeptonow.com/",

    instamart: "https://www.swiggy.com/instamart",

    bigbasket: "https://www.bigbasket.com/",

    jiomart: "https://www.jiomart.com/"
  };


  const url = groceryApps[app];


  if (!url) {
    showToast(
      "Grocery app not available",
      "error"
    );

    return;
  }


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}


// ==========================================================================
// AI RECIPE GENERATION
// ==========================================================================

async function generateRecipe() {

  const btn =
    document.getElementById(
      "generate-recipe-btn"
    );

  const loadingPanel =
    document.getElementById(
      "ai-loading-panel"
    );

  const recipeCard =
    document.getElementById(
      "recipe-card-container"
    );

  const recipeOutput =
    document.getElementById(
      "recipe-output"
    );

  const videoEmbed =
    document.getElementById(
      "video-embed"
    );


  const names =
    activeInventory.map(
      (i) => i.item_name
    );


  if (names.length === 0) {

    showToast(
      "Add some items to your inventory first",
      "error"
    );

    return;
  }


  // Loading state

  if (btn) {
    btn.disabled = true;
  }

  if (recipeCard) {
    recipeCard.classList.add("hidden");
  }

  if (loadingPanel) {
    loadingPanel.classList.remove("hidden");
  }

  startAITextCycle();


  try {

    const res = await fetch(
      `${API_BASE}/api/generate-recipe`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          inventory: names
        })
      }
    );


    if (!res.ok) {

      const err =
        await res.json().catch(
          () => ({})
        );

      throw new Error(
        err.detail ||
        `Recipe failed (${res.status})`
      );
    }


    const data =
      await res.json();


    if (recipeOutput) {
      recipeOutput.textContent =
        data.recipe;
    }


    if (
      videoEmbed &&
      data.youtube_video_id
    ) {

      videoEmbed.innerHTML = `
        <iframe
          src="https://www.youtube.com/embed/${data.youtube_video_id}"
          allowfullscreen
        ></iframe>
      `;

    } else if (videoEmbed) {

      videoEmbed.innerHTML = "";
    }


    if (loadingPanel) {
      loadingPanel.classList.add("hidden");
    }

    if (recipeCard) {
      recipeCard.classList.remove("hidden");
    }

  } catch (err) {

    console.error(
      "generateRecipe Error:",
      err
    );

    showToast(
      err.message ||
      "Recipe generation failed",
      "error"
    );

    if (loadingPanel) {
      loadingPanel.classList.add("hidden");
    }

  } finally {

    if (btn) {
      btn.disabled = false;
    }

    stopAITextCycle();
  }
}


// ==========================================================================
// AI LOADING TEXT
// ==========================================================================

function startAITextCycle() {

  const statusEl =
    document.getElementById(
      "ai-status-text"
    );


  if (!statusEl) {
    return;
  }


  let step = 0;

  statusEl.textContent =
    AI_STEPS[0];


  aiTextCycleInterval =
    setInterval(() => {

      step =
        (step + 1) %
        AI_STEPS.length;


      statusEl.style.opacity =
        "0";


      setTimeout(() => {

        statusEl.textContent =
          AI_STEPS[step];

        statusEl.style.opacity =
          "1";

      }, 150);

    }, 1200);
}


function stopAITextCycle() {

  if (aiTextCycleInterval) {

    clearInterval(
      aiTextCycleInterval
    );

    aiTextCycleInterval = null;
  }
}


// ==========================================================================
// TAB NAVIGATION
// ==========================================================================

function switchTab(
  tabId,
  tabEl
) {

  currentTab = tabId;


  document
    .querySelectorAll(".tab-view")
    .forEach((view) => {
      view.classList.remove(
        "active"
      );
    });


  document
    .querySelectorAll(".nav-tab")
    .forEach((tab) => {
      tab.classList.remove(
        "active"
      );
    });


  const targetView =
    document.getElementById(
      `view-${tabId}`
    );


  if (targetView) {
    targetView.classList.add(
      "active"
    );
  }


  if (tabEl) {
    tabEl.classList.add(
      "active"
    );
  }


  // Sliding pill

  const indicator =
    document.getElementById(
      "nav-indicator"
    );


  if (
    indicator &&
    tabEl &&
    tabEl.parentNode
  ) {

    const tabIndex =
      Array.from(
        tabEl.parentNode.children
      ).indexOf(tabEl);


    indicator.style.transform =
      `translateX(${tabIndex * 100}%)`;
  }
}


// ==========================================================================
// MODAL CONTROLS
// ==========================================================================

function openAddModal() {

  const modal =
    document.getElementById(
      "add-modal"
    );

  if (modal) {
    modal.classList.add(
      "open"
    );
  }
}


function closeAddModal() {

  const modal =
    document.getElementById(
      "add-modal"
    );

  if (modal) {
    modal.classList.remove(
      "open"
    );
  }
}


function closeAddModalOnBackdrop(e) {

  if (
    e.target &&
    e.target.classList.contains(
      "modal-backdrop"
    )
  ) {

    closeAddModal();
  }
}


function handleManualSubmit(e) {

  e.preventDefault();


  const nameInput =
    document.getElementById(
      "modal-item-name"
    );

  const qtyInput =
    document.getElementById(
      "modal-item-qty"
    );


  const name =
    nameInput
      ? nameInput.value.trim()
      : "";


  const qty =
    qtyInput
      ? parseInt(
          qtyInput.value,
          10
        ) || 1
      : 1;


  if (name) {

    addManualItem(
      name,
      qty
    );
  }
}


// ==========================================================================
// ANIMATIONS & MICRO-INTERACTIONS
// ==========================================================================

function setupTactileRipples() {

  document.addEventListener(
    "click",
    (e) => {

      const target =
        e.target.closest(
          ".btn"
        );


      if (!target) {
        return;
      }


      const circle =
        document.createElement(
          "span"
        );


      const diameter =
        Math.max(
          target.clientWidth,
          target.clientHeight
        );


      const radius =
        diameter / 2;


      const rect =
        target.getBoundingClientRect();


      circle.style.width =
        circle.style.height =
        `${diameter}px`;


      circle.style.left =
        `${e.clientX - rect.left - radius}px`;


      circle.style.top =
        `${e.clientY - rect.top - radius}px`;


      circle.classList.add(
        "ripple"
      );


      const ripple =
        target.getElementsByClassName(
          "ripple"
        )[0];


      if (ripple) {
        ripple.remove();
      }


      target.appendChild(
        circle
      );
    }
  );
}


// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================

function showToast(
  message,
  type = "success"
) {

  const container =
    document.getElementById(
      "toast-container"
    );


  if (!container) {
    console.log(
      `[${type}] ${message}`
    );

    return;
  }


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    `toast ${type}`;


  toast.innerHTML = `
    <span>
      ${type === "success" ? "✓" : "✕"}
    </span>

    <span>
      ${escapeHtml(message)}
    </span>
  `;


  container.appendChild(
    toast
  );


  setTimeout(() => {

    toast.style.animation =
      "toastOut 300ms var(--easing) forwards";


    setTimeout(() => {

      toast.remove();

    }, 300);

  }, 3000);
}


// ==========================================================================
// ANIMATED COUNTER
// ==========================================================================

function animateCounter(
  elementId,
  targetValue
) {

  const el =
    document.getElementById(
      elementId
    );


  if (!el) {
    return;
  }


  const startValue =
    parseInt(
      el.textContent,
      10
    ) || 0;


  if (
    startValue ===
    targetValue
  ) {

    return;
  }


  const duration =
    400;


  const startTime =
    performance.now();


  function update(
    currentTime
  ) {

    const elapsed =
      currentTime -
      startTime;


    const progress =
      Math.min(
        elapsed /
          duration,
        1
      );


    const currentValue =
      Math.floor(
        startValue +
        (targetValue -
          startValue) *
          progress
      );


    el.textContent =
      currentValue;


    if (
      progress < 1
    ) {

      requestAnimationFrame(
        update
      );

    } else {

      el.textContent =
        targetValue;
    }
  }


  requestAnimationFrame(
    update
  );
}


// ==========================================================================
// COPY RECIPE
// ==========================================================================

function copyRecipeText() {

  const output =
    document.getElementById(
      "recipe-output"
    );


  if (!output) {
    return;
  }


  const text =
    output.textContent;


  if (!text) {
    return;
  }


  navigator.clipboard.writeText(
    text
  );


  showToast(
    "Recipe copied to clipboard",
    "success"
  );
}


// ==========================================================================
// HTML ESCAPING
// ==========================================================================

function escapeHtml(str) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    String(str ?? "");


  return div.innerHTML;
}

// ==========================================================================
// VOICE CONTROL SYSTEM
// ==========================================================================

let recognition = null;
let isVoiceListening = false;
let voiceCommandInProgress = false;


// ==========================================================================
// INITIALIZE VOICE RECOGNITION
// ==========================================================================

function initializeVoiceControl() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    console.warn(
      "Speech Recognition is not supported by this browser."
    );

    updateVoiceStatus(
      "Voice not supported",
      false
    );

    return;
  }

  recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;

  // English works best for commands such as
  // "Take 2 eggs".
  recognition.lang = "en-IN";

  recognition.onstart = () => {

    isVoiceListening = true;

    updateVoiceStatus(
      "Listening...",
      true
    );

    const btn =
      document.getElementById("voice-btn");

    if (btn) {
      btn.classList.add("listening");
      btn.textContent = "🔴";
    }
  };


  recognition.onresult = async (event) => {

    const transcript =
      event.results[0][0].transcript.trim();

    console.log(
      "Voice command:",
      transcript
    );

    updateVoiceStatus(
      `"${transcript}"`,
      false
    );

    await processVoiceCommand(
      transcript
    );
  };


  recognition.onerror = (event) => {

    console.error(
      "Voice recognition error:",
      event.error
    );

    isVoiceListening = false;

    updateVoiceStatus(
      getVoiceErrorMessage(event.error),
      false
    );

    resetVoiceButton();
  };


  recognition.onend = () => {

    isVoiceListening = false;

    resetVoiceButton();

    if (!voiceCommandInProgress) {
      updateVoiceStatus(
        "Voice Ready",
        false
      );
    }
  };
}


// ==========================================================================
// START / STOP VOICE
// ==========================================================================

function toggleVoiceControl() {

  if (!recognition) {

    initializeVoiceControl();

    if (!recognition) {
      showToast(
        "Voice control is not supported in this browser.",
        "error"
      );

      return;
    }
  }


  if (isVoiceListening) {

    stopVoiceControl();

  } else {

    startVoiceControl();
  }
}


// ==========================================================================
// START LISTENING
// ==========================================================================

function startVoiceControl() {

  if (!recognition) {
    initializeVoiceControl();
  }

  if (!recognition || isVoiceListening) {
    return;
  }

  try {

    recognition.start();

  } catch (error) {

    console.error(
      "Could not start voice recognition:",
      error
    );
  }
}


// ==========================================================================
// STOP LISTENING
// ==========================================================================

function stopVoiceControl() {

  if (!recognition) {
    return;
  }

  try {

    recognition.stop();

  } catch (error) {

    console.error(
      "Could not stop voice recognition:",
      error
    );
  }

  isVoiceListening = false;

  resetVoiceButton();

  updateVoiceStatus(
    "Voice Ready",
    false
  );
}


// ==========================================================================
// VOICE STATUS
// ==========================================================================

function updateVoiceStatus(
  text,
  listening = false
) {

  const status =
    document.getElementById(
      "voice-status"
    );

  if (status) {
    status.textContent = text;
  }

  const button =
    document.getElementById(
      "voice-btn"
    );

  if (button) {

    if (listening) {
      button.classList.add(
        "listening"
      );
    } else {
      button.classList.remove(
        "listening"
      );
    }
  }
}


// ==========================================================================
// RESET VOICE BUTTON
// ==========================================================================

function resetVoiceButton() {

  const button =
    document.getElementById(
      "voice-btn"
    );

  if (!button) {
    return;
  }

  button.classList.remove(
    "listening"
  );

  button.textContent = "🎤";
}


// ==========================================================================
// VOICE ERROR MESSAGES
// ==========================================================================

function getVoiceErrorMessage(error) {

  switch (error) {

    case "not-allowed":
      return "Microphone permission denied";

    case "no-speech":
      return "Didn't hear anything";

    case "audio-capture":
      return "Microphone unavailable";

    case "network":
      return "Voice network error";

    default:
      return "Voice recognition error";
  }
}


// ==========================================================================
// PROCESS VOICE COMMAND
// ==========================================================================

async function processVoiceCommand(
  transcript
) {

  if (!transcript) {
    return;
  }

  voiceCommandInProgress = true;

  const command =
    transcript
      .toLowerCase()
      .trim();


  try {

    // --------------------------------------------------------
    // NAVIGATION COMMANDS
    // --------------------------------------------------------

    if (
      command.includes("open inventory") ||
      command.includes("show inventory") ||
      command.includes("go to inventory")
    ) {

      switchToTabByName(
        "inventory"
      );

      speak(
        "Opening inventory."
      );

      return;
    }


    if (
      command.includes("open recipes") ||
      command.includes("show recipes") ||
      command.includes("open recipe")
    ) {

      switchToTabByName(
        "recipes"
      );

      speak(
        "Opening recipes."
      );

      return;
    }


    if (
      command.includes("open restock") ||
      command.includes("show restock") ||
      command.includes("restock")
    ) {

      switchToTabByName(
        "restock"
      );

      speak(
        "Opening restock alerts."
      );

      return;
    }


    // --------------------------------------------------------
    // INVENTORY QUESTION
    // --------------------------------------------------------

    if (
      command.includes("what is in my fridge") ||
      command.includes("what's in my fridge") ||
      command.includes("show my fridge") ||
      command.includes("list my fridge") ||
      command.includes("fridge inventory")
    ) {

      await announceInventory();

      return;
    }


    // --------------------------------------------------------
    // RESTOCK QUESTION
    // --------------------------------------------------------

    if (
      command.includes("what needs restocking") ||
      command.includes("what needs restock") ||
      command.includes("what is low") ||
      command.includes("what's low")
    ) {

      await announceRestock();

      return;
    }


    // --------------------------------------------------------
    // TAKE / CONSUME ITEM
    // --------------------------------------------------------

    const consumeCommand =
      parseConsumeCommand(command);

    if (consumeCommand) {

      await voiceConsumeItem(
        consumeCommand.itemName,
        consumeCommand.quantity
      );

      return;
    }


    // --------------------------------------------------------
    // ADD ITEM
    // --------------------------------------------------------

    const addCommand =
      parseAddCommand(command);

    if (addCommand) {

      await voiceAddItem(
        addCommand.itemName,
        addCommand.quantity
      );

      return;
    }


    // --------------------------------------------------------
    // GENERATE RECIPE
    // --------------------------------------------------------

    if (
      command.includes("generate recipe") ||
      command.includes("make a recipe") ||
      command.includes("suggest a recipe") ||
      command.includes("cook something")
    ) {

      switchToTabByName(
        "recipes"
      );

      await generateRecipe();

      speak(
        "Generating a recipe using your fridge ingredients."
      );

      return;
    }


    // --------------------------------------------------------
    // HELP
    // --------------------------------------------------------

    if (
      command.includes("help") ||
      command.includes("what can you do")
    ) {

      speak(
        "You can say take two eggs, add five milk, " +
        "what is in my fridge, show restock, " +
        "open recipes, or generate a recipe."
      );

      return;
    }


    // --------------------------------------------------------
    // UNKNOWN COMMAND
    // --------------------------------------------------------

    showToast(
      `I didn't understand "${transcript}"`,
      "error"
    );

    speak(
      "Sorry, I didn't understand that command."
    );

  } finally {

    voiceCommandInProgress = false;
  }
}


// ==========================================================================
// PARSE TAKE COMMAND
// ==========================================================================

function parseConsumeCommand(
  command
) {

  /*
    Examples:

    "take 2 eggs"
    "take two eggs"
    "use 1 milk"
    "consume 3 apples"
    "remove 2 eggs"
  */

  const patterns = [
    /^(?:take|use|consume|remove)\s+(.+?)\s+(.+)$/,
    /^(?:take|use|consume|remove)\s+(.+)$/
  ];


  for (
    const pattern of patterns
  ) {

    const match =
      command.match(pattern);

    if (!match) {
      continue;
    }


    // ------------------------------------------------------
    // Pattern with explicit quantity
    // ------------------------------------------------------

    if (match.length === 3) {

      const quantity =
        parseNumberWord(
          match[1]
        );

      if (
        quantity !== null &&
        quantity > 0
      ) {

        return {
          quantity: quantity,
          itemName: cleanVoiceItemName(
            match[2]
          )
        };
      }
    }


    // ------------------------------------------------------
    // "take eggs" = take 1
    // ------------------------------------------------------

    if (match.length === 2) {

      return {
        quantity: 1,
        itemName: cleanVoiceItemName(
          match[1]
        )
      };
    }
  }

  return null;
}


// ==========================================================================
// PARSE ADD COMMAND
// ==========================================================================

function parseAddCommand(
  command
) {

  /*
    Examples:

    "add 5 eggs"
    "add five eggs"
    "put 3 milk"
    "add milk"
  */

  const patterns = [
    /^(?:add|put|stock|restock)\s+(.+?)\s+(.+)$/,
    /^(?:add|put|stock|restock)\s+(.+)$/
  ];


  for (
    const pattern of patterns
  ) {

    const match =
      command.match(pattern);

    if (!match) {
      continue;
    }


    if (match.length === 3) {

      const quantity =
        parseNumberWord(
          match[1]
        );

      if (
        quantity !== null &&
        quantity > 0
      ) {

        return {
          quantity: quantity,
          itemName: cleanVoiceItemName(
            match[2]
          )
        };
      }
    }


    if (match.length === 2) {

      return {
        quantity: 1,
        itemName: cleanVoiceItemName(
          match[1]
        )
      };
    }
  }

  return null;
}


// ==========================================================================
// NUMBER WORD CONVERSION
// ==========================================================================

function parseNumberWord(
  value
) {

  const text =
    value
      .toLowerCase()
      .trim();


  const numeric =
    Number(text);


  if (
    Number.isInteger(numeric) &&
    numeric > 0
  ) {

    return numeric;
  }


  const numbers = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20
  };


  return numbers[text] ?? null;
}


// ==========================================================================
// CLEAN VOICE ITEM NAME
// ==========================================================================

function cleanVoiceItemName(
  name
) {

  return name
    .replace(
      /^(the|some|of)\s+/i,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


// ==========================================================================
// VOICE CONSUME ITEM
// ==========================================================================

async function voiceConsumeItem(
  itemName,
  quantity
) {

  const item =
    findInventoryItem(
      itemName
    );


  if (!item) {

    showToast(
      `${itemName} is not in your fridge.`,
      "error"
    );

    speak(
      `${itemName} is not in your fridge.`
    );

    return;
  }


  if (
    quantity > Number(item.quantity)
  ) {

    showToast(
      `Only ${item.quantity} ${item.item_name} available.`,
      "error"
    );

    speak(
      `You only have ${item.quantity} ${item.item_name}.`
    );

    return;
  }


  try {

    const res =
      await fetch(
        `${API_BASE}/api/items/${item.id}/consume`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            quantity: quantity
          })
        }
      );


    const data =
      await res.json().catch(
        () => ({})
      );


    if (!res.ok) {

      throw new Error(
        data.detail ||
        "Could not update inventory."
      );
    }


    await loadInventory();
    await loadRestockAlerts();


    showToast(
      `Used ${quantity} ${item.item_name}. ${data.quantity} remaining.`,
      "success"
    );


    speak(
      `Used ${quantity} ${item.item_name}. ` +
      `${data.quantity} remaining.`
    );

  } catch (error) {

    console.error(
      "voiceConsumeItem:",
      error
    );

    showToast(
      error.message ||
      "Could not update inventory.",
      "error"
    );
  }
}


// ==========================================================================
// VOICE ADD ITEM
// ==========================================================================

async function voiceAddItem(
  itemName,
  quantity
) {

  try {

    await addManualItem(
      itemName,
      quantity
    );


    speak(
      `Added ${quantity} ${itemName} to your fridge.`
    );

  } catch (error) {

    console.error(
      "voiceAddItem:",
      error
    );
  }
}


// ==========================================================================
// FIND INVENTORY ITEM
// ==========================================================================

function findInventoryItem(
  itemName
) {

  const normalized =
    itemName
      .toLowerCase()
      .trim();


  // Exact match
  let item =
    activeInventory.find(
      (i) =>
        i.item_name
          .toLowerCase()
          .trim() === normalized
    );


  if (item) {
    return item;
  }


  // Partial match
  item =
    activeInventory.find(
      (i) =>
        i.item_name
          .toLowerCase()
          .includes(normalized) ||
        normalized.includes(
          i.item_name
            .toLowerCase()
        )
    );


  return item || null;
}


// ==========================================================================
// ANNOUNCE INVENTORY
// ==========================================================================

async function announceInventory() {

  if (
    !activeInventory ||
    activeInventory.length === 0
  ) {

    speak(
      "Your fridge is currently empty."
    );

    showToast(
      "Your fridge is empty.",
      "error"
    );

    return;
  }


  const items =
    activeInventory
      .map(
        (item) =>
          `${item.quantity} ${item.item_name}`
      )
      .join(", ");


  const message =
    `You have ${items} in your fridge.`;


  showToast(
    `${activeInventory.length} items in your fridge`,
    "success"
  );


  speak(message);
}


// ==========================================================================
// ANNOUNCE RESTOCK
// ==========================================================================

async function announceRestock() {

  try {

    await loadRestockAlerts();

    if (
      !restockAlerts ||
      restockAlerts.length === 0
    ) {

      speak(
        "Everything looks healthy. " +
        "Nothing needs restocking right now."
      );

      showToast(
        "Nothing needs restocking",
        "success"
      );

      return;
    }


    const items =
      restockAlerts
        .map(
          (item) =>
            `${item.item_name}, ` +
            `${item.days_remaining} days remaining`
        )
        .join(". ");


    speak(
      `These items need restocking. ${items}`
    );

    switchToTabByName(
      "restock"
    );

  } catch (error) {

    console.error(
      "announceRestock:",
      error
    );

    speak(
      "I couldn't check the restock list."
    );
  }
}


// ==========================================================================
// SWITCH TAB USING TAB NAME
// ==========================================================================

function switchToTabByName(
  tabName
) {

  const tab =
    document.querySelector(
      `.nav-tab[onclick*="'${tabName}'"]`
    );


  if (tab) {

    switchTab(
      tabName,
      tab
    );

    return;
  }


  // Fallback
  const view =
    document.getElementById(
      `view-${tabName}`
    );

  if (view) {

    document
      .querySelectorAll(".tab-view")
      .forEach(
        (v) =>
          v.classList.remove(
            "active"
          )
      );

    view.classList.add(
      "active"
    );
  }
}


// ==========================================================================
// TEXT TO SPEECH
// ==========================================================================

function speak(
  text
) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }


  window.speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang = "en-IN";
  utterance.rate = 0.95;
  utterance.pitch = 1;


  window.speechSynthesis.speak(
    utterance
  );
}


// ==========================================================================
// INITIALIZE
// ==========================================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeVoiceControl();

  }
);