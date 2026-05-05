console.log("[popup.js] Script loaded.");

/**
 * Checks whether the given SKU is already in the cart DOM.
 * Only intended to run on the /cart page.
 *
 * @param {string} sku - The SKU to look for.
 * @returns {boolean} True if the SKU is found in the cart.
 */
function isFreeGiftInCart(sku) {
  // Guard: SKU must be a non-empty string
  if (!sku || typeof sku !== "string" || sku.trim() === "") {
    console.warn("[popup.js] isFreeGiftInCart: received invalid SKU argument:", sku);
    return false;
  }

  try {
    // The SKU is rendered as a text node immediately after a
    // <span class="cart-inline-title-short">SKU: </span> label in each cart row.
    const skuLabels = document.querySelectorAll("span.cart-inline-title-short");

    if (skuLabels.length === 0) {
      console.warn("[popup.js] isFreeGiftInCart: no SKU label elements found in DOM. Cart may be empty or markup has changed.");
      return false;
    }

    for (const label of skuLabels) {
      if (label.textContent.trim() === "SKU:") {
        const textNode = label.nextSibling;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const cartSku = textNode.textContent.trim();
          if (cartSku === sku) {
            console.log(`[popup.js] isFreeGiftInCart: SKU "${sku}" found in cart DOM.`);
            return true;
          }
        } else {
          console.warn("[popup.js] isFreeGiftInCart: SKU label found but adjacent text node is missing or unexpected.");
        }
      }
    }

    console.log(`[popup.js] isFreeGiftInCart: SKU "${sku}" not found in cart DOM.`);
    return false;
  } catch (err) {
    console.warn("[popup.js] isFreeGiftInCart: unexpected error checking cart DOM:", err.message);
    return false;
  }
}

/**
 * Returns all SKUs present in the cart DOM on the /cart page.
 * Reads the text node following each "SKU:" label in the cart table.
 * @returns {string[]} Array of SKU strings found in the cart.
 */
function getAllCartSkus() {
  try {
    const skus = [];
    const skuLabels = document.querySelectorAll("span.cart-inline-title-short");

    if (skuLabels.length === 0) {
      console.warn("[popup.js] getAllCartSkus: no SKU label elements found. Cart may be empty or markup has changed.");
      return skus;
    }

    for (const label of skuLabels) {
      if (label.textContent.trim() === "SKU:") {
        // The SKU value is the text node immediately following the <span> label
        const textNode = label.nextSibling;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const sku = textNode.textContent.trim();
          if (sku) {
            skus.push(sku);
          } else {
            console.warn("[popup.js] getAllCartSkus: found a SKU label with an empty text node.");
          }
        } else {
          console.warn("[popup.js] getAllCartSkus: SKU label found but adjacent text node is missing or unexpected.");
        }
      }
    }

    console.log(`[popup.js] getAllCartSkus: found ${skus.length} SKU(s) in cart:`, skus);
    return skus;
  } catch (err) {
    console.error("[popup.js] getAllCartSkus: unexpected error reading cart SKUs:", err.message);
    return [];
  }
}

/**
 * On the /cart page, checks if the free gift is the ONLY item in the cart.
 * If so, alerts the user and clicks the item's Remove button to auto-remove it.
 * @param {string} freeGiftSku - The free gift SKU to check against.
 */
function enforceFreeGiftRule(freeGiftSku) {
  // Guard: SKU must be a non-empty string
  if (!freeGiftSku || typeof freeGiftSku !== "string" || freeGiftSku.trim() === "") {
    console.warn("[popup.js] enforceFreeGiftRule: received invalid freeGiftSku argument:", freeGiftSku);
    return;
  }

  try {
    const cartSkus = getAllCartSkus();
    console.log(`[popup.js] enforceFreeGiftRule: cart contains ${cartSkus.length} SKU(s). Checking if free gift is sole item.`);

    // Only enforce if the cart contains exactly one item AND that item is the free gift
    const freeGiftIsPresent = cartSkus.includes(freeGiftSku);
    const onlyFreeGift = cartSkus.length === 1 && freeGiftIsPresent;

    if (!freeGiftIsPresent) {
      console.log(`[popup.js] enforceFreeGiftRule: free gift SKU "${freeGiftSku}" is not in the cart. No action needed.`);
      return;
    }

    if (!onlyFreeGift) {
      console.log(`[popup.js] enforceFreeGiftRule: free gift is in the cart alongside other items. No action needed.`);
      return;
    }

    // Free gift is the sole cart item — alert the user then auto-remove it
    console.log(`[popup.js] enforceFreeGiftRule: free gift SKU "${freeGiftSku}" is the only item in the cart. Alerting user.`);
    alert("The free gift must be purchased together with another item. It has been removed from your cart.");

    // Locate the cart row for the free gift SKU by re-scanning SKU labels
    const skuLabels = document.querySelectorAll("span.cart-inline-title-short");
    let removed = false;

    for (const label of skuLabels) {
      if (label.textContent.trim() !== "SKU:") continue;

      const textNode = label.nextSibling;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;
      if (textNode.textContent.trim() !== freeGiftSku) continue;

      // Walk up to the enclosing <tr class="cart-item">
      const row = label.closest("tr.cart-item");
      if (!row) {
        console.warn("[popup.js] enforceFreeGiftRule: matched SKU label but could not find enclosing 'tr.cart-item'. Markup may have changed.");
        break;
      }

      // Find the Remove button inside the row
      const removeBtn = row.querySelector("button.remove-cart-item");
      if (!removeBtn) {
        console.warn("[popup.js] enforceFreeGiftRule: found cart row but could not find 'button.remove-cart-item' within it. Markup may have changed.");
        break;
      }

      console.log("[popup.js] enforceFreeGiftRule: clicking Remove button for free gift item.");
      removeBtn.click();
      removed = true;
      break;
    }

    if (!removed) {
      console.error(`[popup.js] enforceFreeGiftRule: failed to remove free gift SKU "${freeGiftSku}" from the cart. The Remove button could not be located.`);
    }

  } catch (err) {
    console.error("[popup.js] enforceFreeGiftRule: unexpected error:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[popup.js] DOM fully loaded and parsed.");

  try {
    // Only run on the /cart page
    const isCartPage = window.location.pathname === "/cart";
    if (!isCartPage) {
      console.log("[popup.js] Not on /cart page. Popup will not be shown.");
      return;
    }

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

    if (today < promoStart || today > promoEnd) {
      console.log("[popup.js] Promotion is not active. Current date is outside the promo window.");
      return;
    }

    console.log("[popup.js] Promotion is active.");

    // Don't show popup if the cart is empty
    if (document.querySelector("p.empty_cart")) {
      console.log("[popup.js] Cart is empty. Popup will not be shown.");
      return;
    }

    const freeGiftSku = scriptTag.getAttribute("data-free-gift-sku");

    // Enforce: if the free gift is the only item in the cart, alert and remove it
    if (freeGiftSku) {
      enforceFreeGiftRule(freeGiftSku);
    }

    // If the free gift is already in the cart (alongside other items), suppress the popup
    if (freeGiftSku && isFreeGiftInCart(freeGiftSku)) {
      console.log(`[popup.js] Free gift SKU "${freeGiftSku}" is already in the cart. Skipping popup.`);
      return;
    }

    const title = scriptTag.getAttribute("data-title") || "Default Title";
    const image = scriptTag.getAttribute("data-image") || "/default-image.jpg";

    console.log("[popup.js] Title:", title);
    console.log("[popup.js] Image:", image);

    showPromoPopup(title, image);

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