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

let withdrawalContainers = document.querySelectorAll(".withdrawal-container");

let amount = document.getElementById("amount");
let numberOfDays = 1;

let userDetail;
let hasInvestment = true;
let totalAmount = 0;
let btcPrice;

let getUserXhr = new XMLHttpRequest();
getUserXhr.open("GET", `/user/email/${userEmail}`, true);
getUserXhr.send();

getUserXhr.onreadystatechange = function () {
  if (this.status == 200 && this.readyState == 4) {
    let response = JSON.parse(this.response);
    userDetail = response;
    let firstName = response.fullName.split(" ", 1);
    document.getElementById("firstname").innerText = firstName;

    getAccount();
  }
};

function getAccount() {
  let investmentXhr = new XMLHttpRequest();
  investmentXhr.open(
    "GET",
    `/account/${userDetail.account.accountId}/investment`,
    true
  );
  investmentXhr.send();

  investmentXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      if (response == null) {
      } else {
        document.getElementById("account-balance").innerText = numberWithCommas(
          response.account.accountBalance
        );
        document.getElementById("account-level").innerText =
          response.investmentPlan;
        totalAmount = response.account.accountBalance;
        numberOfDays = response.days;
        hasInvestment = response.active;
        updateBitcoinEquivalent(
          response.account.accountBalance,
          document.getElementById("btc-balance")
        );
      }
      let spinner = document.getElementById("withdrawal-spinner");
      spinner.children[0].className = spinner.children[0].className.replace(
        "opacity-1",
        "opacity-0"
      );
      document.getElementById("withdrawal-container").style.display = "block";
      setTimeout(function () {
        spinner.style.display = "none";
      }, 1000);
    
    }
  };
}

/* Payout rails offered on this page: the select's value on the left, the
   label the backend stores (and Transaction History renders) on the right. */
let withdrawalMethods = {
  bitcoin: "Bitcoin",
  paypal: "PayPal",
  bank: "Bank",
};

function selectedWithdrawalMethod() {
  let select = document.getElementById("withdrawal-method");
  let value = select ? select.value : "";
  return withdrawalMethods[value] ? value : "";
}

function withdrawalField(id) {
  let field = document.getElementById(id);
  return field ? String(field.value || "").trim() : "";
}

/* Where the payout is sent, collected from the selected rail's own fields.
   Returns "" while any of them is still empty. */
function withdrawalDestination(method) {
  if (method === "bitcoin") return withdrawalField("btc");
  if (method === "paypal") return withdrawalField("paypal");

  /* A wire needs four separate numbers, so label them: the string is kept on
     the withdrawal record and read by whoever settles the payout, where an
     unlabelled "A / B / C / D" is easy to misread as the wrong account. */
  let parts = [
    ["Bank", "name"],
    ["Account name", "account-name"],
    ["Account number", "account-number"],
    ["SWIFT", "swift"],
  ]
    .map(function (pair) {
      let value = withdrawalField(pair[1]);
      return value ? pair[0] + ": " + value : "";
    })
    .filter(Boolean);
  return parts.join(" / ");
}

function withdrawalDestinationPrompt(method) {
  if (method === "bitcoin") return "Enter your BTC wallet address.";
  if (method === "paypal") return "Enter your Paypal number.";
  return "Fill in your bank name, account name, account number and SWIFT code.";
}

/* The spinner is shown for the whole request and must always come back:
   every exit path (success, HTTP error, send() throwing) goes through here
   so the form can never be left hidden behind a spinner that never stops. */
function setWithdrawalBusy(busy) {
  let spinner = document.getElementById("withdrawal-spinner");
  let container = document.getElementById("withdrawal-container");

  if (spinner && spinner.children[0]) {
    spinner.children[0].className = spinner.children[0].className.replace(
      busy ? "opacity-0" : "opacity-1",
      busy ? "opacity-1" : "opacity-0"
    );
  }
  if (spinner) spinner.style.display = busy ? "flex" : "none";
  if (container) container.style.display = busy ? "none" : "block";
}

function withdraw() {
  /* Validate before anything is hidden: an invalid request must leave the
     form exactly as the member found it. */
  let method = selectedWithdrawalMethod();
  if (!method) {
    alert("Please select a withdrawal method.");
    return;
  }

  let destination = withdrawalDestination(method);
  if (!destination) {
    alert(withdrawalDestinationPrompt(method));
    return;
  }

  let rawAmount = amount ? String(amount.value || "").trim() : "";
  let requested = Number(rawAmount);
  if (rawAmount === "" || !isFinite(requested) || requested <= 0) {
    alert("Please enter a valid withdrawal amount.");
    return;
  }
  /* The account balance is stored in whole dollars, so anything else could
     never be settled. */
  if (!Number.isInteger(requested)) {
    alert("Withdrawal amounts must be whole US dollars.");
    return;
  }
  if (requested > Number(totalAmount)) {
    alert(
      "Amount exceeds your available balance of $" +
        numberWithCommas(totalAmount) +
        "."
    );
    return;
  }

  setWithdrawalBusy(true);

  let withdrawalPayload = {
    user: userDetail,
    amount: requested,
    withdrawalStatus: "Pending",
    method: withdrawalMethods[method],
    /* Only a Bitcoin payout touches a chain; the fiat rails carry no asset. */
    crypto: method === "bitcoin" ? { cryptoId: 1 } : null,
    walletAddress: destination,
    date: moment(),
  };
  createWithdrawal(withdrawalPayload);
}

function createWithdrawal(withdrawalPayload) {
  let withdrawalXhr = new XMLHttpRequest();

  /* Handler attached before send(). Every non-200 outcome restores the form
     instead of leaving the spinner running forever. */
  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState !== 4) return;

    if (this.status === 200) {
      setWithdrawalBusy(false);
      let withdrawalModal = document.getElementById(
        "withdrawal-processing-modal"
      );
      if (withdrawalModal) withdrawalModal.style.display = "block";
      setTimeout(function () {
        location.replace(`dashboard.html?email=${userEmail}`);
      }, 5000);
      return;
    }

    setWithdrawalBusy(false);
    alert("We could not submit your withdrawal request. Please try again.");
  };

  withdrawalXhr.open("POST", "/withdrawal", true);
  withdrawalXhr.setRequestHeader("Content-Type", "application/json");
  try {
    withdrawalXhr.send(JSON.stringify(withdrawalPayload));
  } catch (error) {
    setWithdrawalBusy(false);
    alert("We could not submit your withdrawal request. Please try again.");
  }
}

function updateBitcoinEquivalent(amount, target) {
  if (!target || !Number.isFinite(Number(amount))) return;
  let priceXhr = new XMLHttpRequest();
  priceXhr.open(
    "GET",
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    true
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

// getCryptoUpdate();

// function getCryptoUpdate() {
//   let cryptoUpdateXhr = new XMLHttpRequest();
//   cryptoUpdateXhr.open(
//     "GET",
//     "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=4&page=1&sparkline=false",
//     true
//   );
//   cryptoUpdateXhr.send();

//   cryptoUpdateXhr.onreadystatechange = function () {
//     if (this.readyState == 4 && this.status == 200) {
//       let response = JSON.parse(this.response);
//       document.getElementById("btc-balance").innerText = (
//         totalAmount / response[0].current_price
//       ).toFixed(8);
//     }
//   };
// }

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

  if (targetId == "proceed") {
    if (numberOfDays > 0 || totalAmount < 100) {
      alert(
        "Withdrawal Request cannot be made until investment cycle is complete"
      );
    } else {
      withdraw();
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
  let targetId = e.target.id;
  if (targetId == "withdrawal-method") {
    withdrawalContainers.forEach(function (withdrawalContainer) {
      withdrawalContainer.style.display = "none";
    });
    /* The placeholder option has no panel of its own. */
    let panel = document.getElementById(`${e.target.value}-container`);
    if (panel) panel.style.display = "block";
  }
});

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
