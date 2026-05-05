console.log("[popup.js] Script loaded.");

// SKU that should never trigger the popup; auto-removed when it is the sole cart item
const BLOCKED_SKU = "PKPDC2020YZZZ";
const POPUP_SCRIPT_SELECTOR = 'script[src*="popup.js"]';


/**
 * Finds the cart row for the given SKU and clicks its remove button/link.
 * @param {string} sku - The SKU to remove from the cart DOM.
 */
const removeSkuFromCartDom = (sku) => {
  try {
    const skuLabels = document.querySelectorAll("span.cart-inline-title-short");
    let removed = false;

    for (const label of skuLabels) {
      if (label.textContent.trim() !== "SKU:") continue;

      const textNode = label.nextSibling;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;
      if (textNode.textContent.trim() !== sku) continue;

      const row = label.closest("tr.cart-item");
      if (!row) {
        console.warn(`[popup.js] removeSkuFromCartDom: matched SKU "${sku}" but could not find enclosing 'tr.cart-item'.`);
        break;
      }

      // Support both button and anchor remove controls
      const removeEl = row.querySelector("button.remove-cart-item, a.remove-cart-item");
      if (!removeEl) {
        console.warn(`[popup.js] removeSkuFromCartDom: found cart row for SKU "${sku}" but could not locate remove button/link.`);
        break;
      }

      console.log(`[popup.js] removeSkuFromCartDom: clicking remove for SKU "${sku}".`);
      removeEl.click();
      removed = true;
      break;
    }

    if (!removed) {
      console.error(`[popup.js] removeSkuFromCartDom: failed to remove SKU "${sku}" from the cart.`);
    }
  } catch (err) {
    console.error("[popup.js] removeSkuFromCartDom: unexpected error:", err.message);
  }
};

/**
 * Locates the popup script tag by src and throws if it is missing.
 * @returns {HTMLScriptElement}
 */
const getPopupScriptTagOrThrow = () => {
  // Locate the script tag by matching its src — all config is passed via data attributes
  const scriptTag = document.querySelector(POPUP_SCRIPT_SELECTOR);

  if (!scriptTag) {
    throw new Error("Could not find <script> tag with src containing 'popup.js'. Ensure the script is loaded correctly.");
  }

  return scriptTag;
};

/**
 * Reads and validates promo date range from script data attributes.
 * @param {HTMLScriptElement} scriptTag
 * @returns {{promoStart: Date, promoEnd: Date}}
 */
const getPromoWindowOrThrow = (scriptTag) => {
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

  return { promoStart, promoEnd };
};

/**
 * Enforces free-gift-only cart rule.
 * @param {Array<{sku?: string}>} cartItems
 * @param {string} guardSku
 * @returns {boolean} True when popup should be suppressed.
 */
const enforceGuardSkuRule = (cartItems, guardSku) => {
  const guardSkuInCart = cartItems.some((item) => item.sku === guardSku);

  if (!guardSkuInCart) {
    return false;
  }

  if (cartItems.length === 1) {
    console.log(`[popup.js] Guard SKU "${guardSku}" is the only item in the cart. Alerting and removing it.`);
    alert("This free gift must be purchased with another item. It has been removed from your cart.");
    removeSkuFromCartDom(guardSku);
  } else {
    console.log(`[popup.js] Guard SKU "${guardSku}" is already in the cart with other item(s). Suppressing popup.`);
  }

  return true;
};

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[popup.js] DOM fully loaded and parsed.");

  try {
    // Only run on the /cart page
    const isCartPage = window.location.pathname === "/cart";
    if (!isCartPage) {
      console.log("[popup.js] Not on /cart page. Popup will not be shown.");
      return;
    }

    const scriptTag = getPopupScriptTagOrThrow();
    const { promoStart, promoEnd } = getPromoWindowOrThrow(scriptTag);

    console.log("[popup.js] Promo Start:", promoStart);
    console.log("[popup.js] Promo End:", promoEnd);

    // Check if the promotion is currently active
    const today = new Date();
    console.log("[popup.js] Today:", today);

    if (today < promoStart || today > promoEnd) {
      console.log("[popup.js] Promotion is not active. Current date is outside the promo window.");
      return;
    }

    console.log("[popup.js] Promotion is active.");

    const freeGiftSku = scriptTag.getAttribute("data-free-gift-sku");
    const title = scriptTag.getAttribute("data-title") ?? "Default Title";
    const image = scriptTag.getAttribute("data-image") ?? "/default-image.jpg";

    // Use the cart API to reliably check cart contents before showing the popup
    try {
      const res = await fetch("/cart.js");
      const cart = await res.json();
      console.log("[popup.js] Cart API response:", cart);

      const { items = [] } = cart || {};
      const cartItems = Array.isArray(items) ? items : [];

      if (cartItems.length === 0) {
        console.log("[popup.js] Cart is empty (via API). Popup will not be shown.");
        return;
      }

      console.log("[popup.js] Cart has items:", cartItems.map(({ sku }) => sku));

      // Enforce the configured free-gift SKU rule using API cart data first.
      // If data-free-gift-sku is not set, fall back to BLOCKED_SKU.
      const guardSku = freeGiftSku || BLOCKED_SKU;

      if (enforceGuardSkuRule(cartItems, guardSku)) {
        return;
      }

      console.log("[popup.js] Title:", title);
      console.log("[popup.js] Image:", image);

      showPromoPopup(title, image);
    } catch (err) {
      console.warn("[popup.js] Could not reach /cart.js, falling back to DOM check:", err.message);

      // Fallback: check DOM for empty cart indicator
      if (document.querySelector("p.empty_cart")) {
        console.log("[popup.js] Cart is empty (DOM fallback). Popup will not be shown.");
        return;
      }

      showPromoPopup(title, image);
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
const showPromoPopup = (title, image) => {
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
          <button id="add-free-gift" class="btn secondary" style="margin-right: 10px;">Claim Here</button>
          <button id="decline-free-gift" class="btn secondary" style="opacity: .6;">No Thanks</button>
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
};

/**
 * Redirects the user to the free gift product page.
 * The URL is read from the script tag's data-free-gift-url attribute.
 */
const addFreeGiftToCart = () => {
  try {
    const scriptTag = getPopupScriptTagOrThrow();

    const freeGiftPageUrl = scriptTag.getAttribute("data-free-gift-url") ?? "/default-product-url";

    // Validate the URL is a relative path or same-origin absolute URL before redirecting
    // to prevent open-redirect vulnerabilities from tampered data attributes.
    let safeUrl;
    try {
      const parsed = new URL(freeGiftPageUrl, window.location.origin);
      if (parsed.origin !== window.location.origin) {
        throw new Error(`Redirect target "${freeGiftPageUrl}" points to a different origin (${parsed.origin}). Redirect blocked.`);
      }
      safeUrl = parsed.pathname + parsed.search + parsed.hash;
    } catch (urlErr) {
      console.error("[popup.js] addFreeGiftToCart: invalid or unsafe redirect URL:", urlErr.message);
      return;
    }

    console.log("[popup.js] addFreeGiftToCart: redirecting to:", safeUrl);
    window.location.href = safeUrl;
  } catch (err) {
    console.error("[popup.js] Error redirecting to free gift page:", err.message);
  }
};

/**
 * Removes the popup from the DOM if it exists.
 */
const closePopup = () => {
  const popup = document.getElementById("promo-popup");
  if (popup) {
    popup.remove();
    console.log("[popup.js] Popup removed from DOM.");
  } else {
    console.warn("[popup.js] closePopup called but no popup found in DOM.");
  }
};