let userEmail = new URLSearchParams(window.location.search).get("email");

/* Keep the brand home link session-aware (pages require ?email=). */
document.querySelectorAll(".sc-nav-home").forEach(function (link) {
  if (userEmail) {
    link.href = "./dashboard.html?email=" + encodeURIComponent(userEmail);
  }
});

/* Shared nav links: same destinations as the dashboard navigation,
   session-aware and deep-linked to the matching dashboard panel. */
document.querySelectorAll("[data-sc-page]").forEach(function (link) {
  if (userEmail) {
    let query = link.getAttribute("data-sc-query");
    link.href =
      "./" +
      link.getAttribute("data-sc-page") +
      "?email=" +
      encodeURIComponent(userEmail) +
      (query ? "&" + query : "");
  }
});

let paymentInfos = document.querySelectorAll(".payment-info");
let userDetail;
let pageRevealed = false;

function revealPage() {
  if (pageRevealed) return;
  pageRevealed = true;

  let spinner = document.getElementById("deposit-spinner");
  if (spinner) {
    spinner.children[0].className = spinner.children[0].className.replace(
      "opacity-1",
      "opacity-0",
    );
    setTimeout(function () {
      spinner.style.display = "none";
    }, 1000);
  }
  document.getElementById("deposit-container").style.display = "block";
}

function updateBitcoinEquivalent(amount, target) {
  if (!target || !Number.isFinite(Number(amount))) return;
  let priceXhr = new XMLHttpRequest();
  priceXhr.open(
    "GET",
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    true,
  );
  priceXhr.send();
  priceXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      try {
        let response = JSON.parse(this.response);
        let price = Number(response.bitcoin.usd);
        if (price > 0) target.innerText = (Number(amount) / price).toFixed(8);
      } catch (error) {
        target.innerText = "0.00000000";
      }
    }
  };
}

function getAccount() {
  let investmentXhr = new XMLHttpRequest();
  investmentXhr.open(
    "GET",
    `/account/${userDetail.account.accountId}/investment`,
    true,
  );
  investmentXhr.send();

  investmentXhr.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) {
        try {
          let response = JSON.parse(this.response);
          if (response) {
            document.getElementById("account-balance").innerText =
              numberWithCommas(response.account.accountBalance);
            document.getElementById("account-level").innerText =
              response.investmentPlan || "NONE";
            updateBitcoinEquivalent(
              response.account.accountBalance,
              document.getElementById("btc-balance"),
            );
          }
        } catch (error) {
          /* keep the placeholder figures */
        }
      }
      revealPage();
    }
  };
}

if (userEmail) {
  let getUserXhr = new XMLHttpRequest();
  getUserXhr.open("GET", `/user/email/${userEmail}`, true);
  getUserXhr.send();

  getUserXhr.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) {
        try {
          let response = JSON.parse(this.response);
          userDetail = response;
          let firstName = response.fullName.split(" ", 1);
          document.getElementById("firstname").innerText = firstName;
          getAccount();
          return;
        } catch (error) {
          /* fall through and show the page with placeholder figures */
        }
      }
      revealPage();
    }
  };
} else {
  revealPage();
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* Top bar: the toggle reveals the navigation menu (same behavior as the
   dashboard's navBar.js); the user chip opens the account menu. */
let settingsMenu = document.getElementById("settings");
let navItems = document.getElementById("nav-items");
let navToggle = document.getElementById("toggle-nav");
let navMenuOpen = false;

function setNavMenu(open) {
  navMenuOpen = open;
  if (navToggle) {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.classList.toggle("is-open", open);
  }
  if (!navItems) return;
  if (open) {
    navItems.style.display = "block";
    navItems.className = navItems.className.replace("opacity-0", "opacity-1");
  } else {
    navItems.className = navItems.className.replace("opacity-1", "opacity-0");
    setTimeout(function () {
      if (!navMenuOpen) {
        navItems.style.display = "none";
      }
    }, 500);
  }
}

function setSettingsMenu(open) {
  if (!settingsMenu) return;
  settingsMenu.style.display = open ? "block" : "none";
  /* Keep every control that owns the menu in sync (desktop user chip). */
  document
    .querySelectorAll('[aria-controls="settings"]')
    .forEach(function (control) {
      control.setAttribute("aria-expanded", String(open));
    });
}

if (navToggle) {
  navToggle.addEventListener("click", function () {
    setNavMenu(!navMenuOpen);
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    setNavMenu(false);
    setSettingsMenu(false);
  }
});

document.body.addEventListener("click", function (e) {
  let targetId = e.target.id;

  /* Standard dropdown behavior: close open menus when clicking outside. */
  if (
    navMenuOpen &&
    !e.target.closest("#nav-items") &&
    !e.target.closest("#toggle-nav")
  ) {
    setNavMenu(false);
  }
  if (
    settingsMenu &&
    settingsMenu.style.display === "block" &&
    !e.target.closest("#settings") &&
    !e.target.closest("#user-chip")
  ) {
    setSettingsMenu(false);
  }

  if (e.target.closest && e.target.closest(".copy")) {
    let copyBtn = e.target.closest(".copy");
    let panel = copyBtn.closest(".payment-info");
    let input = panel ? panel.querySelector("input") : null;
    if (input) {
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          /* The promise rejects when the document is not focused (e.g. an
             embedded frame); swallow it so no unhandled rejection is logged. */
          navigator.clipboard.writeText(input.value).catch(function () {});
        }
      } catch (error) {
        /* clipboard unavailable — the address stays selected for a manual copy */
      }
      copyBtn.innerText = "COPIED";
      copyBtn.classList.add("w3-text-green");
      setTimeout(function () {
        copyBtn.innerText = "COPY";
        copyBtn.classList.remove("w3-text-green");
      }, 2000);
    }
  } else if (e.target.closest && e.target.closest("#user-chip")) {
    setSettingsMenu(settingsMenu.style.display !== "block");
  } else if (targetId == "logout-setting") {
    document.location.href = "logout";
  } else if (targetId == "profile-setting") {
    location.href = `dashboard.html?email=${userEmail}`;
  }
});

document.body.addEventListener("change", function (e) {
  if (e.target.id == "deposit-method") {
    paymentInfos.forEach(function (paymentInfo) {
      paymentInfo.style.display = "none";
    });
    let panel = document.getElementById(`${e.target.value}-info`);
    if (panel) panel.style.display = "block";
  }
});
