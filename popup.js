document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  let testMode = true; // Set to true for testing purposes
  // Check if the promotion is active
  const today = new Date();
  let promoStart, promoEnd;

  if (testMode) {
    promoStart = new Date(today);
    promoEnd = new Date(today);
    promoEnd.setDate(promoEnd.getDate() + 1); // Set end date to tomorrow
  } else {
    promoStart = new Date("2025-06-11");
    promoEnd = new Date("2025-07-11");
  }

  if (today >= promoStart && today <= promoEnd) {
    showPromoPopup();
  } else {
    console.log("Promotion is not active.");
  }
});

function showPromoPopup() {
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
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; max-width: 400px;">
      <h2 style="margin-top: 0px; padding-top: 0px;">Would you like a FREE Rosie Magnet?</h2>
      <img src="/no-image.jpg" alt="Rosie Magnet" style="width: 100%; max-width: 200px; margin: 10px 0;">
      <div class="float-md-end">
        <button id="add-free-gift" class="btn secondary">Yes, Add Now</button>
        <button id="decline-free-gift" class="btn secondary" style="opacity: .6">No, Thank You</button>
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
  // Redirect to the item's page
  const freeGiftPageUrl = "/products/1627448"; // Replace with the actual product page URL
  window.location.href = freeGiftPageUrl;
}

function closePopup() {
  const popup = document.getElementById("promo-popup");
  if (popup) {
    popup.remove();
  }
}

console.log("Script loaded");