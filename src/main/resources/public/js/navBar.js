/* Mobile navigation toggle. The button carries aria-expanded and morphs
   between a hamburger and an X via CSS; legacy icon-font toggles (which
   swap fa-bars/fa-times glyphs) are still supported. */
let isOpen;
let navItems = document.getElementById("nav-items");
let navToggle = document.getElementById("toggle-nav");

function setNavOpen(open) {
  isOpen = open;

  if (navToggle) {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.classList.toggle("is-open", open);
    if (
      navToggle.classList.contains("fa-bars") ||
      navToggle.classList.contains("fa-times")
    ) {
      navToggle.classList.toggle("fa-bars", !open);
      navToggle.classList.toggle("fa-times", open);
    }
  }

  if (open) {
    navItems.style.display = "block";
    navItems.className = navItems.className.replace("opacity-0", "opacity-1");
  } else {
    /* Only the menu is dismissed here. #app-settings is a sibling overlay
       (not part of this menu), so closing the menu must not tear the
       settings screen down behind it. */
    navItems.className = navItems.className.replace("opacity-1", "opacity-0");
    setTimeout(function () {
      if (!isOpen) {
        navItems.style.display = "none";
      }
    }, 500);
  }
}

if (navToggle && navItems) {
  navToggle.addEventListener("click", function () {
    setNavOpen(!isOpen);
  });

  /* Standard menu behavior: Escape closes the open menu. */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      setNavOpen(false);
    }
  });
}
