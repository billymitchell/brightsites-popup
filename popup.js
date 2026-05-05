console.log("[popup.js] Script loaded.");

document.addEventListener("DOMContentLoaded", () => {
  console.log("[popup.js] DOM fully loaded and parsed.");

  try {
    // Locate the script tag by matching its src — all config is passed via data attributes
    const scriptTag = document.querySelector('script[src*="popup.js"]');

    if (!scriptTag) {
      throw new Error("Could not find <script> tag with src containing 'popup.js'. Ensure the script is loaded correctly.");
    }

    // Read and validate promo date range
    const promoStartAttr = scriptTag.getAttribute("data-promo-start");
    const promoEndAttr = scriptTag.getAttribute("data-promo-end");

    if (!promoStartAttr || !promoEndAttr) {
      throw new Error("Missing required data attributes: data-promo-start and/or data-promo-end.");
    }

    const promoStart = new Date(promoStartAttr);
    const promoEnd = new Date(promoEndAttr);

    if (isNaN(promoStart.getTime()) || isNaN(promoEnd.getTime())) {
      throw new Error(`Invalid date format. data-promo-start: "${promoStartAttr}", data-promo-end: "${promoEndAttr}"`);
    }

    console.log("[popup.js] Promo Start:", promoStart);
    console.log("[popup.js] Promo End:", promoEnd);

    // Check if the promotion is currently active
    const today = new Date();
    console.log("[popup.js] Today:", today);

    if (today >= promoStart && today <= promoEnd) {
      console.log("[popup.js] Promotion is active.");

      const title = scriptTag.getAttribute("data-title") || "Default Title";
      const image = scriptTag.getAttribute("data-image") || "/default-image.jpg";

      console.log("[popup.js] Title:", title);
      console.log("[popup.js] Image:", image);

      showPromoPopup(title, image);
    } else {
      console.log("[popup.js] Promotion is not active. Current date is outside the promo window.");
    }
  } catch (err) {
    console.error("[popup.js] Initialization error:", err.message);
  }
});

/**
 * Builds and injects the promo modal overlay into the page.
 * @param {string} title - The promo headline displayed in the popup.
 * @param {string} image - URL of the promo image.
 */
function showPromoPopup(title, image) {
  try {
    // Prevent duplicate popups if the script is somehow called twice
    if (document.getElementById("promo-popup")) {
      console.warn("[popup.js] Popup already exists in the DOM. Skipping.");
      return;
    }

    // Create the full-screen overlay container
    const popup = document.createElement("div");
    popup.id = "promo-popup";
    popup.style.position = "fixed";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.width = "100%";
    popup.style.height = "100%";
    popup.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    popup.style.display = "flex";
    popup.style.justifyContent = "center";
    popup.style.alignItems = "center";
    popup.style.zIndex = "1000";

    // Populate the modal card with title, image, and Yes/No buttons
    popup.innerHTML = `
      <div style="
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;">
        <h2>${title}</h2>
        <img src="${image}" alt="${title}" style="width: 100%; max-width: 200px; margin: 10px 0;">
        <div style="margin-top: 20px;">
          <button id="add-free-gift" class="btn secondary" style="margin-right: 10px;">Yes</button>
          <button id="decline-free-gift" class="btn secondary" style="opacity: .6;">No</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    console.log("[popup.js] Popup injected into DOM.");

    // "Yes" — redirect to the free gift product page
    const yesBtn = document.getElementById("add-free-gift");
    const noBtn = document.getElementById("decline-free-gift");

    if (!yesBtn || !noBtn) {
      throw new Error("Could not find popup buttons after injecting HTML.");
    }

    yesBtn.addEventListener("click", () => {
      console.log("[popup.js] User accepted the promo.");
      addFreeGiftToCart();
      closePopup();
    });

    // "No" — dismiss the popup
    noBtn.addEventListener("click", () => {
      console.log("[popup.js] User declined the promo.");
      closePopup();
    });
  } catch (err) {
    console.error("[popup.js] Error showing popup:", err.message);
  }
}

/**
 * Redirects the user to the free gift product page.
 * The URL is read from the script tag's data-free-gift-url attribute.
 */
function addFreeGiftToCart() {
  try {
    const scriptTag = document.querySelector('script[src*="popup.js"]');

    if (!scriptTag) {
      throw new Error("Could not find script tag to read data-free-gift-url.");
    }

    const freeGiftPageUrl = scriptTag.getAttribute("data-free-gift-url") || "/default-product-url";
    console.log("[popup.js] Redirecting to free gift URL:", freeGiftPageUrl);

    window.location.href = freeGiftPageUrl;
  } catch (err) {
    console.error("[popup.js] Error redirecting to free gift page:", err.message);
  }
}

/**
 * Removes the popup from the DOM if it exists.
 */
function closePopup() {
  const popup = document.getElementById("promo-popup");
  if (popup) {
    popup.remove();
    console.log("[popup.js] Popup removed from DOM.");
  } else {
    console.warn("[popup.js] closePopup called but no popup found in DOM.");
  }
}