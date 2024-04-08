let HUDLeft;
let HUDLeftCloseButton;
let HUDLeftOpenButton;

function closeHUDLeft() {
  HUDLeft.classList.add("hud-left-hidden");
  HUDLeftOpenButton.classList.remove("hud-left-hidden");
}

function openHUDLeft() {
  HUDLeft.classList.remove("hud-left-hidden");
  HUDLeftOpenButton.classList.add("hud-left-hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  HUDLeft = document.querySelector("#hud-left");
  HUDLeftCloseButton = document.querySelector("#hud-left--close-button");
  HUDLeftOpenButton = document.querySelector("#hud-left--open-button");

  HUDLeftCloseButton.addEventListener("click", closeHUDLeft);
  HUDLeftOpenButton.addEventListener("click", openHUDLeft);
});
