document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  // Get promoStart and promoEnd from the script tag's data attributes
  const scriptTag = document.querySelector('script[src*="popup.js"]');
  const promoStart = new Date(scriptTag.getAttribute("data-promo-start"));
  const promoEnd = new Date(scriptTag.getAttribute("data-promo-end"));

  console.log("Promo Start:", promoStart);
  console.log("Promo End:", promoEnd);

  // Check if the promotion is active
  const today = new Date();
  if (today >= promoStart && today <= promoEnd) {
    const title = scriptTag.getAttribute("data-title") || "Default Title";
    const image = scriptTag.getAttribute("data-image") || "/default-image.jpg";

    console.log("Title:", title);
    console.log("Image:", image);

    // Use these variables in your popup
    showPromoPopup(title, image);
  } else {
    console.log("Promotion is not active.");
  }
});

function showPromoPopup(title, image) {
  // Create the pop-up modal
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

  // Add event listeners for buttons
  document.getElementById("add-free-gift").addEventListener("click", () => {
    addFreeGiftToCart();
    closePopup();
  });

  document.getElementById("decline-free-gift").addEventListener("click", () => {
    closePopup();
  });
}

function addFreeGiftToCart() {
  // Get the free gift URL from the script tag's data attribute
  const scriptTag = document.querySelector('script[src*="popup.js"]');
  const freeGiftPageUrl = scriptTag.getAttribute("data-free-gift-url") || "/default-product-url";

  // Redirect to the item's page
  window.location.href = freeGiftPageUrl;
}

function closePopup() {
  const popup = document.getElementById("promo-popup");
  if (popup) {
    popup.remove();
  }
}

console.log("Script loaded");