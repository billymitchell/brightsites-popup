console.log("[popup.js] Script loaded.");

/**
 * Checks whether the given SKU is already in the cart.
 *
 * On the /cart page: parses the cart DOM directly by looking for the SKU
 * text rendered next to the "SKU:" label in each cart row.
 *
 * On other pages: attempts the /cart.js API (Shopify). If unavailable,
 * defaults to false so the popup is not suppressed.
 *
 * @param {string} sku - The SKU to look for.
 * @returns {Promise<boolean>} True if the SKU is found in the cart.
 */
async function isFreeGiftInCart(sku) {
  try {
    const isCartPage = window.location.pathname === "/cart";

    if (isCartPage) {
      // On the /cart page, the SKU is rendered in the DOM next to a
      // <span class="cart-inline-title-short">SKU: </span> label.
      // Walk all such labels and check the following text node for a match.
      const skuLabels = document.querySelectorAll("span.cart-inline-title-short");
      for (const label of skuLabels) {
        if (label.textContent.trim() === "SKU:") {
          // The SKU value is the text node immediately after the <span>
          const textNode = label.nextSibling;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const cartSku = textNode.textContent.trim();
            if (cartSku === sku) {
              console.log(`[popup.js] SKU "${sku}" found in cart DOM.`);
              return true;
            }
          }
        }
      }
      console.log(`[popup.js] SKU "${sku}" not found in cart DOM.`);
      return false;
    }

    // Non-cart pages: attempt the /cart.js API (Shopify-compatible platforms)
    const response = await fetch("/cart.js");
    if (!response.ok) {
      throw new Error(`Cart API responded with status ${response.status}`);
    }
    const cart = await response.json();
    const found = cart.items.some((item) => item.sku === sku);
    console.log(`[popup.js] Checked cart API for SKU "${sku}": ${found ? "found" : "not found"}`);
    return found;
  } catch (err) {
    // If the check fails, default to showing the popup rather than suppressing it
    console.warn("[popup.js] Could not check cart for SKU:", err.message);
    return false;
  }
}

/**
 * Returns all SKUs present in the cart DOM on the /cart page.
 * Reads the text node following each "SKU:" label in the cart table.
 * @returns {string[]} Array of SKU strings found in the cart.
 */
function getAllCartSkus() {
  const skus = [];
  const skuLabels = document.querySelectorAll("span.cart-inline-title-short");
  for (const label of skuLabels) {
    if (label.textContent.trim() === "SKU:") {
      const textNode = label.nextSibling;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const sku = textNode.textContent.trim();
        if (sku) skus.push(sku);
      }
    }
  }
  console.log("[popup.js] All SKUs in cart:", skus);
  return skus;
}

/**
 * On the /cart page, checks if the free gift is the ONLY item in the cart.
 * If so, alerts the user and clicks the item's Remove button to auto-remove it.
 * @param {string} freeGiftSku - The free gift SKU to check against.
 */
function enforceFreeGiftRule(freeGiftSku) {
  try {
    const cartSkus = getAllCartSkus();

    // Only enforce if the free gift is present and is the sole item
    const onlyFreeGift =
      cartSkus.length === 1 && cartSkus[0] === freeGiftSku;

    if (!onlyFreeGift) {
      console.log("[popup.js] Free gift rule: cart has other items or free gift not present. No action needed.");
      return;
    }

    console.log(`[popup.js] Free gift SKU "${freeGiftSku}" is the only item in the cart. Alerting user and removing it.`);

    alert("The free gift must be purchased together with another item. It has been removed from your cart.");

    // Find the cart row containing the free gift SKU and click its Remove button
    const skuLabels = document.querySelectorAll("span.cart-inline-title-short");
    for (const label of skuLabels) {
      if (label.textContent.trim() === "SKU:") {
        const textNode = label.nextSibling;
        if (
          textNode &&
          textNode.nodeType === Node.TEXT_NODE &&
          textNode.textContent.trim() === freeGiftSku
        ) {
          // Walk up to the <tr class="cart-item"> and find the Remove button within it
          const row = label.closest("tr.cart-item");
          if (!row) {
            console.warn("[popup.js] Could not find cart row for free gift SKU.");
            return;
          }
          const removeBtn = row.querySelector("button.remove-cart-item");
          if (!removeBtn) {
            console.warn("[popup.js] Could not find Remove button in the free gift cart row.");
            return;
          }
          console.log("[popup.js] Clicking Remove button for free gift item.");
          removeBtn.click();
          return;
        }
      }
    }

    console.warn("[popup.js] Could not locate the free gift row to remove.");
  } catch (err) {
    console.error("[popup.js] Error enforcing free gift rule:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
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

      // On the /cart page, enforce that the free gift cannot be the only item
      const isCartPage = window.location.pathname === "/cart";
      const freeGiftSku = scriptTag.getAttribute("data-free-gift-sku");
      if (isCartPage && freeGiftSku) {
        enforceFreeGiftRule(freeGiftSku);
      }

      // Check if the free gift SKU is already in the cart — if so, suppress the popup
      
      if (freeGiftSku) {
        const skuInCart = await isFreeGiftInCart(freeGiftSku);
        if (skuInCart) {
          console.log(`[popup.js] Free gift SKU "${freeGiftSku}" is already in the cart. Skipping popup.`);
          return;
        }
      }

      // Determine whether to show the popup:
      // - Always show on the /cart page
      // - Otherwise, only show once per session (tracked via sessionStorage)
      
      const hasSeenPopup = sessionStorage.getItem("promoPopupSeen") === "true";

      console.log("[popup.js] Is cart page:", isCartPage);
      console.log("[popup.js] Has seen popup this session:", hasSeenPopup);

      if (!isCartPage && hasSeenPopup) {
        console.log("[popup.js] Popup already shown this session and not on /cart. Skipping.");
        return;
      }

      const title = scriptTag.getAttribute("data-title") || "Default Title";
      const image = scriptTag.getAttribute("data-image") || "/default-image.jpg";

      console.log("[popup.js] Title:", title);
      console.log("[popup.js] Image:", image);

      // Mark popup as seen for this session (cart page always re-shows)
      sessionStorage.setItem("promoPopupSeen", "true");

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