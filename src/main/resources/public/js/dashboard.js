let userEmail = new URLSearchParams(window.location.search).get("email");

/* Keep the brand home link session-aware (pages require ?email=). */
document.querySelectorAll(".sc-nav-home").forEach(function (link) {
  if (userEmail) {
    link.href = "./dashboard.html?email=" + encodeURIComponent(userEmail);
  }
});

/* Shared nav links: same destinations as every other app screen,
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
let hasStatus = new URLSearchParams(window.location.search).has("status");
/* Panel requested via ?status= from the shared navigation; applied once the
   user's details finish loading (setUserDetailsSetting shows a panel too). */
let pendingSettingsPanel = null;
let interestAccountCard = document.getElementById("card-1");
let loanCard = document.getElementById("card-2");

let confirmModal = document.getElementById("confirm-modal");

let paymentInfos = document.querySelectorAll(".payment-info");

let fullNameEtx = document.getElementById("fullname-etx");
let mobileNumberEtx = document.getElementById("mobile-number-etx");
let addressLine1Etx = document.getElementById("address-line-1-etx");
let addressLine2Etx = document.getElementById("address-line-2-etx");
let accountTypeSel = document.getElementById("account-type-sel");
let daySel = document.getElementById("day-sel");
let monthSel = document.getElementById("month-sel");
let yearSel = document.getElementById("year-sel");
let ssnEtx = document.getElementById("ssn-etx");

let currentPasswordEtx = document.getElementById("current-password-etx");
let newPasswordEtx = document.getElementById("new-password-etx");
let confirmPasswordEtx = document.getElementById("confirm-password-etx");

let withdrawEtx = document.getElementById("withdraw-etx");
let withdrawBtn = document.getElementById("withdraw-btn");

let settingsSpinner = document.getElementById("settings-spinner");

let btcImage = document.getElementById("btc-image");
let ethImage = document.getElementById("eth-image");
let bnbImage = document.getElementById("bnb-image");

let btcAddr = document.getElementById("btc-addr");
let ethAddr = document.getElementById("eth-addr");
let bnbAddr = document.getElementById("bnb-addr");

let usdtSelector = document.getElementById("usdt");
let chat = document.getElementById("chat");

let addressDetails;
let accountType;
let userDetail;
let cryptos;
let cryptoUpdate = [];
let hasInvestment;
let totalAmountNew = 0;

getCryptoUpdate();

let isSettingsOpened = false;
let isAppSetingsOpened;

let canWithdraw;

let getUserXhr = new XMLHttpRequest();
getUserXhr.open("GET", `/user/email/${userEmail}`, true);
getUserXhr.send();

getUserXhr.onreadystatechange = function () {
  if (this.status == 200 && this.readyState == 4) {
    let response = JSON.parse(this.response);
    userEmail = response.email;
    userDetail = response;
    if (response.accountNonLocked == false) {
      if (response.active == false) {
        location.replace(
          `/get-started.html?status=verify&useremail=${response.email}`,
        );
      } else {
        location.replace(`/address.html?email=${response.email}`);
      }
    } else {
      let firstName = response.fullName.split(" ", 1);
      document.getElementById("firstname").innerText = firstName;
document.getElementById("fullname").innerText = response.fullName;
  if (document.getElementById("dashboard-name")) {
    document.getElementById("dashboard-name").innerText = firstName;
  }
      if (document.getElementById("firstname-mobile")) {
        document.getElementById("firstname-mobile").innerText = firstName;
      }

      let spinner = document.getElementById("dashboard-spinner");
      spinner.children[0].className = spinner.className.replace(
        "opacity-1",
        "opacity-0",
      );
      document.getElementById("dashboard-container").style.display = "block";
      setTimeout(function () {
        spinner.style.display = "none";
      }, 1000);

      getUserAddress();
      getAccount();
      getTransactions();
    }
  }
};

if (document.getElementById("usd-info")) {
  paymentInfoSelection(document.getElementById("usd-info"));
}

document.body.addEventListener("input", function (e) {
  if (
    withdrawEtx.value <= userDetail.account.accountBalance &&
    withdrawEtx.value.length != 0 &&
    userDetail.account.accountBalance > 500 &&
    hasInvestment == false
  ) {
    withdrawBtn.classList.replace(
      "blue-background-inactive",
      "blue-background",
    );
    canWithdraw = true;
  } else {
    withdrawBtn.classList.replace(
      "blue-background",
      "blue-background-inactive",
    );
    canWithdraw = false;
  }
});

document.body.addEventListener("click", function (e) {
  let targetId = e.target.id;
  if (!targetId && e.target.closest) {
    let idParent = e.target.closest("p[id]");
    if (idParent) {
      targetId = idParent.id;
    }
  }

  if (targetId == "start-conversation") {
  } else if (targetId == "customer-support") {
  } else if (targetId == "back-to-start-conversation-card") {
  } else if (targetId == "send-message") {
  } else if (
    targetId == "open-fund-modal" ||
    targetId == "open-fund-modal-mobile"
  ) {
    document.getElementById("fund-modal").style.display = "block";
  } else if (targetId == "close-fund-modal") {
    document.getElementById("fund-modal").style.display = "none";
  } else if (
    targetId == "open-withdraw-modal" ||
    targetId == "open-withdraw-modal-mobile"
  ) {
    // document.getElementById("withdraw-modal").style.display = "block";
    location.href = `withdrawal.html?email=${userEmail}`;
  } else if (targetId == "close-withdraw-modal") {
    document.getElementById("withdraw-modal").style.display = "none";
  } else if (
    targetId == "open-withdraw-history-modal" ||
    targetId == "open-withdraw-history-modal-mobile"
  ) {
    document.getElementById("settings").style.display = "none";
    isSettingsOpened = false;
    setTimeout(function () {
      document.getElementById("app-settings").style.display = "block";
      isAppSetingsOpened = true;
    }, 200);
    settingsSpinner.style.display = "none";
    settingDetailSelector("withdrawal-options");
  } else if (
    targetId == "open-trade-modal" ||
    targetId == "open-trade-modal-mobile"
  ) {
    document.getElementById("trade-modal").style.display = "block";
  } else if (targetId == "close-trade-modal") {
    document.getElementById("trade-modal").style.display = "none";
  } else if (
    targetId == "open-borrow-modal" ||
    targetId == "open-borrow-modal-mobile"
  ) {
    document.getElementById("borrow-modal").style.display = "block";
  } else if (targetId == "close-borrow-modal") {
    document.getElementById("borrow-modal").style.display = "none";
  } else if (targetId == "contact-support-trade") {
  } else if (
    targetId == "refer-a-friend" ||
    targetId == "refer-a-friend-mobile"
  ) {
    document.getElementById("refer-modal").style.display = "block";
  } else if (targetId == "close-refer-modal") {
    document.getElementById("refer-modal").style.display = "none";
  } else if (targetId == "contact-support-borrow") {
    /* live chat removed */
  } else if (targetId == "firstname") {
    if (isAppSetingsOpened) {
      document.getElementById("app-settings").style.display = "none";
      isAppSetingsOpened = false;
    } else {
      if (isSettingsOpened) {
        isSettingsOpened = false;
        document.getElementById("settings").style.display = "none";
      } else {
        isSettingsOpened = true;
        document.getElementById("settings").style.display = "block";
      }
    }
  } else if (targetId == "firstname-mobile") {
    document.getElementById("settings").style.display = "none";
    isSettingsOpened = false;
    setTimeout(function () {
      document.getElementById("app-settings").style.display = "block";
      isAppSetingsOpened = true;
    }, 200);
    setUserDetailsSetting(addressDetails);
  } else if (targetId == "profile-setting") {
    document.getElementById("settings").style.display = "none";
    isSettingsOpened = false;
    setTimeout(function () {
      document.getElementById("app-settings").style.display = "block";
      isAppSetingsOpened = true;
    }, 200);
    setUserDetailsSetting(addressDetails);
  } else if (targetId == "logout-setting") {
    document.location.href = "logout";
  } else if (targetId == "logo" || targetId == "logo-mobile") {
    if (isAppSetingsOpened) {
      document.getElementById("app-settings").style.display = "none";
      isAppSetingsOpened = false;
    }
  } else if (targetId == "profile") {
    settingSelector(e.target);
    settingDetailSelector("profile-options");
  } else if (targetId == "security") {
    settingSelector(e.target);
    settingDetailSelector("security-options");
  } else if (targetId == "wallet") {
    settingSelector(e.target);
    settingDetailSelector("wallet-options");
  } else if (targetId == "withdrawals") {
    settingSelector(e.target);
    settingDetailSelector("withdrawal-options");
  } else if (targetId == "interest") {
    settingSelector(e.target);
    settingDetailSelector("interest-options");
    arrangeInterest();
  } else if (targetId == "wire-details") {
    settingSelector(e.target);
  } else if (targetId == "save-profile") {
    updateUserProfile();
  } else if (targetId == "save-security") {
    updatePassword();
  } else if (e.target.classList.contains("change")) {
    e.target.parentElement.previousElementSibling.children[0].readOnly = false;
    e.target.parentElement.previousElementSibling.children[0].focus();
  } else if (
    e.target.id == "select-crypto" ||
    e.target.id == "select-crypto-2"
  ) {
    document.getElementById("crypto-deposit-option").style.display = "block";
  } else if (e.target.id == "usd") {
    document.getElementById("fund-heading").textContent = "Fund";
    document.getElementById("crypto-deposit-option").style.display = "none";
    document.getElementById("select-crypto").textContent =
      "Select Crypto or USD";
    paymentInfoSelection(document.getElementById("usd-info"));
  } else if (e.target.id == "btc") {
    document.getElementById("fund-heading").textContent = "Bitcoin Deposit";
    document.getElementById("crypto-deposit-option").style.display = "none";
    document.getElementById("select-crypto").textContent = "Bitcoin (BTC)";
    paymentInfoSelection(document.getElementById("btc-info"));
  } else if (e.target.id == "eth") {
    document.getElementById("fund-heading").textContent = "BSC Deposit";
    document.getElementById("crypto-deposit-option").style.display = "none";
    document.getElementById("select-crypto").textContent = "BSC (BSC)";
    paymentInfoSelection(document.getElementById("eth-info"));
  } else if (e.target.id == "usdt") {
    document.getElementById("fund-heading").textContent =
      "USDT Deposit (TRC 20)";
    document.getElementById("crypto-deposit-option").style.display = "none";
    document.getElementById("select-crypto").textContent = "USD Token (USDT)";
    paymentInfoSelection(document.getElementById("usdt-info"));
  } else if (e.target.id == "xpr") {
    document.getElementById("fund-heading").textContent =
      "XPR Deposit (BEP 20)";
    document.getElementById("crypto-deposit-option").style.display = "none";
    document.getElementById("select-crypto").textContent = "XPR Token (XPR)";
    paymentInfoSelection(document.getElementById("xpr-info"));
  } else if (e.target.id == "apply-for-loan") {
    /* live chat removed */
  } else if (e.target.id == "loan-history") {
    /* live chat removed */
  } else if (e.target.id == "learn-more") {
    /* live chat removed */
  } else if (e.target.id == "bnb") {
    document.getElementById("fund-heading").textContent = "BNB Deposit";
    document.getElementById("crypto-deposit-option").style.display = "none";
    document.getElementById("select-crypto").textContent = "Binance (BNB)";
    paymentInfoSelection(document.getElementById("bnb-info"));
  } else if (e.target.classList.contains("copy")) {
    e.target.parentElement.previousElementSibling.children[0].select();
    e.target.parentElement.previousElementSibling.children[0].setSelectionRange(
      0,
      99999,
    );
    navigator.clipboard.writeText(
      e.target.parentElement.previousElementSibling.children[0].value,
    );
    e.target.innerText = "COPIED";
    e.target.classList.add("w3-text-green");
  } else if (e.target.id == "contact-support-otp") {
    /* live chat removed */
  } else if (e.target.id == "withdraw-btn") {
    if (canWithdraw) {
      withdraw();
    }
  } else if (
    e.target.id == "open-trade-history-modal" ||
    e.target.id == "open-trade-history-modal-2"
  ) {
    document.getElementById("trade-history-room-modal").style.display = "block";
  } else if (e.target.id == "close-trade-history-modal") {
    document.getElementById("trade-history-room-modal").style.display = "none";
  } else if (
    e.target.classList.contains("invest-now") ||
    e.target.id == "invest-now"
  ) {
    let investModal = document.getElementById("investment-amount");
    if (investModal) investModal.style.display = "none";
    location.href =
      "deposit.html" +
      (userEmail ? "?email=" + encodeURIComponent(userEmail) : "");
  } else if (e.target.id == "close-investment-plan-modal") {
    document.getElementById("investment-plan-modal").style.display = "none";
  } else if (e.target.id == "add-wallet") {
    document.getElementById("add-wallet-modal").style.display = "block";
  } else if (e.target.id == "close-add-wallet-modal") {
    document.getElementById("add-wallet-modal").style.display = "none";
  } else if (e.target.id == "save-wallet") {
    saveWallet();
  } else if (e.target.id == "select-crypto-wallet") {
    console.log("Selected");
    document.getElementById("add-wallet-modal").style.display = "block";
  } else if (
    e.target.id == "open-invest-modal-1" ||
    e.target.id == "open-invest-modal-2"
  ) {
    console.log("Yeah");
    document.getElementById("investment-plan-modal").style.display = "block";
  } else if (e.target.id == "select-wire-payment") {
    /* live chat removed */
  } else if (e.target.id == "copy-referral") {
    /* The field already holds the whole encoded link, so the button copies
       verbatim -- what you see is what lands on the clipboard. */
    let referralInput = document.getElementById("referral-id");
    let referralLink = referralInput.value.trim();

    referralInput.select();
    referralInput.setSelectionRange(0, 99999);

    /* Only report success once the link is really on the clipboard -- the
       icon used to turn green before the write settled, so a rejected
       promise both logged an unhandled error and lied to the member. */
    let markCopied = function (ok) {
      e.target.classList.toggle("w3-text-green", ok);
      e.target.title = ok ? "Copied" : "Copy failed - select and press Ctrl+C";
    };

    if (!referralLink) {
      markCopied(false);
      return;
    }

    /* Clipboard API is unavailable on insecure origins and can be blocked
       even on localhost; fall back to copying a hidden field instead of
       failing silently. */
    let legacyCopy = function () {
      let holder = document.createElement("textarea");
      holder.value = referralLink;
      holder.setAttribute("readonly", "");
      holder.style.position = "fixed";
      holder.style.top = "-1000px";
      holder.style.opacity = "0";
      document.body.appendChild(holder);
      holder.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      document.body.removeChild(holder);
      markCopied(ok);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralLink).then(
        function () {
          markCopied(true);
        },
        legacyCopy,
      );
    } else {
      legacyCopy();
    }
  }
});

/* The copy control is a <span>, so mirror Enter/Space for keyboard users. */
document.body.addEventListener("keydown", function (e) {
  if (
    e.target.id == "copy-referral" &&
    (e.key == "Enter" || e.key == " " || e.key == "Spacebar")
  ) {
    e.preventDefault();
    e.target.click();
  }
});

if (hasStatus) {
  /* Deep links from the shared navigation: land on the same panel the
     matching dashboard nav item opens. */
  let navStatus = new URLSearchParams(window.location.search).get("status");
  if (navStatus == "history") {
    pendingSettingsPanel = "withdrawal-options";
  } else if (navStatus == "refer") {
    document.getElementById("refer-modal").style.display = "block";
  } else if (navStatus == "profile") {
    pendingSettingsPanel = "profile-options";
  } else if (navStatus == "fund") {
    /* Legacy ?status=fund deep link: the deposit modal is now a page. */
    location.replace(
      "deposit.html" +
        (userEmail ? "?email=" + encodeURIComponent(userEmail) : ""),
    );
  }
}

function saveWallet() {
  let walletName = document.getElementById("choose-crypto").value;
  let walletAddress = document.getElementById("wallet-address").value;

  document.getElementById("select-crypto-wallet").innerText =
    `${walletName} - ${walletAddress}`;
  document.getElementById("add-wallet-modal").style.display = "none";
}

function withdraw() {
  document.getElementById("withdraw-container").style.visibility = "hidden";
  document.getElementById("withdraw-spinner").style.display = "block";

  setInterval(function () {
    showWithdrawalOTP();
  }, 2000);

  let withdrawalPayload = {
    user: userDetail,
    amount: withdrawEtx.value,
    withdrawalStatus: "Pending",
    crypto: { cryptoId: document.getElementById("choose-crypto").value },
    walletAddress: document.getElementById("wallet-address").value,
    date: moment(),
  };

  let withdrawalXhr = new XMLHttpRequest();
  withdrawalXhr.open("POST", "/withdrawal", true);
  withdrawalXhr.setRequestHeader("Content-Type", "application/json");
  console.log(withdrawalPayload);
  withdrawalXhr.send(JSON.stringify(withdrawalPayload));

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      location.reload();
    }
  };
}

function showWithdrawalOTP() {
  document.getElementById("withdraw-spinner").style.display = "none";
  document.getElementById("withdraw-container").style.display = "none";

  document.getElementById("otp-container").style.display = "block";
}

function paymentInfoSelection(info) {
  paymentInfos.forEach(function (item) {
    item.style.display = "none";
  });
  info.style.display = "block";
}

getCryptoUpdate();

function getCryptoUpdate() {
  let cryptoUpdateXhr = new XMLHttpRequest();
  cryptoUpdateXhr.open(
    "GET",
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=4&page=1&sparkline=false",
    true,
  );
  cryptoUpdateXhr.send();

  cryptoUpdateXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      console.log(response[0].current_price);
    }
  };
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

function bindCrypto(crypto) {
  return `<div class="w3-row" style="margin-top: 32px">
								<div class="w3-col s1">
									<input name="crypto" value="${crypto.cryptoId}" type="radio" />
								</div>
								<div class="w3-col s11">${crypto.crypto} (${crypto.symbol})</div>
							</div>`;
}

function arrangeInterest() {
  document.getElementById("crypto-root-2").innerHTML = "";
  cryptos.forEach(function (crypto) {
    document.getElementById("crypto-root-2").innerHTML += bindCrypto(crypto);
  });
}

function getAccount() {
  let account = userDetail.account;
  document.getElementById("account-balance").innerText = numberWithCommas(
    account.accountBalance,
  );
  totalAmountNew = account.accountBalance.toFixed(1);
  let spinner = document.getElementById("dashboard-spinner");
  spinner.className = spinner.className.replace("opacity-1", "opacity-2");
  document.getElementById("dashboard-container").style.display = "block";
  setTimeout(function () {
    spinner.style.display = "block";
  }, 100);
  getCryptos();

  let investmentXhr = new XMLHttpRequest();
  investmentXhr.open("GET", `/account/${account.accountId}/investment`, true);
  investmentXhr.send();

  investmentXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      if (response == null) {
      } else {
        document.getElementById("interest-account").innerText =
          numberWithCommas(response.investedAmount);
        document.getElementById("account-level").innerText =
          response.investmentPlan;

        updateBitcoinEquivalent(
          response.account.accountBalance,
          document.getElementById("btc-price")
        );
      }
    }
  };
}

function investmentComplete(investment, expectedAmount) {
  console.log(expectedAmount);
  if (investment.active) {
    let investmentCompleteXhr = new XMLHttpRequest();
    investmentCompleteXhr.open(
      "GET",
      `/investment/${investment.investmentId}/roi/${expectedAmount}`,
      true,
    );
    investmentCompleteXhr.send();

    investmentCompleteXhr.onreadystatechange = function () {
      if (this.status == 200 && this.readyState == 4) {
        let response = JSON.parse(this.response);
        location.reload();
      }
    };
  } else {
  }
}

function getUserAddress() {
  let getUserAddressXhr = new XMLHttpRequest();
  getUserAddressXhr.open("GET", `/address/user/${userEmail}`, true);
  getUserAddressXhr.send();

  getUserAddressXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      addressDetails = response;
      let getAccountTypeXhr = new XMLHttpRequest();
      getAccountTypeXhr.open("GET", `/accounttype`, true);
      getAccountTypeXhr.send();

      getAccountTypeXhr.onreadystatechange = function () {
        if (this.status == 200 && this.readyState == 4) {
          let response = JSON.parse(this.response);
          accountType = response;
          setUserDetailsSetting(addressDetails);
        }
      };
    }
  };
}

/* Referral ids are built from the member's full name, so they always carry
   a space ("Test Investor-AUXrX6"). The referral field therefore holds the
   complete, encoded share link -- what a member copies is what they see. */
function buildReferralLink(referralId) {
  let code = (referralId || "").trim();
  if (!code) {
    return "";
  }
  /* The field is re-read when the copy button is pressed, so a value that
     is already a link must not be encoded a second time. */
  if (/^https?:\/\//i.test(code)) {
    return code;
  }
  return (
    location.origin + "/get-started.html?referral=" + encodeURIComponent(code)
  );
}

function setUserDetailsSetting(userDetails) {
  let referralInput = document.getElementById("referral-id");
  /* Show the whole shareable link rather than the bare code, so a manual
     Ctrl+C still produces something that opens the sign-up page. */
  referralInput.value = buildReferralLink(userDetails.user.referralId);
  referralInput.title = referralInput.value;
  settingsSpinner.style.display = "none";
  document.getElementById("profile-options").style.display = "block";
  fullNameEtx.value = userDetails.user.fullName;
  mobileNumberEtx.value = userDetails.mobileNumber;
  addressLine1Etx.value = userDetails.addressLine1;
  addressLine2Etx.value = userDetails.addressLine2;
  accountTypeSel.innerHTML = "";
  accountType.forEach(function (accType) {
    let selected = "";
    if (userDetails.accountType.accountTypeId == accType.accountTypeId) {
      selected = "selected";
    }
    accountTypeSel.innerHTML += bindSelect(
      accType.accountTypeId,
      accType.accountType,
      selected,
    );
  });

  /* Apply the panel requested via ?status= (deep links from the shared
     navigation) once the settings screen is populated. */
  if (pendingSettingsPanel) {
    let pendingPanel = pendingSettingsPanel;
    pendingSettingsPanel = null;
    document.getElementById("app-settings").style.display = "block";
    isAppSetingsOpened = true;
    settingDetailSelector(pendingPanel);
    let optionId =
      pendingPanel == "withdrawal-options"
        ? "withdrawals"
        : pendingPanel == "profile-options"
          ? "profile"
          : null;
    if (optionId) {
      /* The settings screen no longer has a left menu to light up, so the
         highlight is skipped when its element is not in the document. */
      let option = document.getElementById(optionId);
      if (option) {
        settingSelector(option);
      }
    }
  }
}

function settingSelector(currentSetting) {
  let options = document.querySelectorAll(".setting-option");
  options.forEach(function (option) {
    option.classList.remove("green-text");
    option.nextElementSibling.classList.replace("green-border", "grey-border");
  });
  currentSetting.classList.add("green-text");
  currentSetting.nextElementSibling.classList.replace(
    "grey-border",
    "green-border",
  );
}

function settingDetailSelector(currentSettingDetail) {
  currentSettingDetail = document.getElementById(currentSettingDetail);
  let settingDetails = document.querySelectorAll(".setting-option-detail");
  settingDetails.forEach(function (settingDetail) {
    settingDetail.style.display = "none";
  });
  currentSettingDetail.style.display = "block";
}

function updateUserProfile() {
  document.getElementById("profile-options").style.display = "none";
  settingsSpinner.style.display = "block";
  addressDetails.user.fullName = fullNameEtx.value;
  addressDetails.mobileNumber = mobileNumberEtx.value;
  addressDetails.addressLine1 = addressLine1Etx.value;
  addressDetails.addressLine2 = addressLine2Etx.value;
  addressDetails.accountType.accountTypeId = accountTypeSel.value;
  addressDetails.ssn = ssnEtx.value;

  let updateUserXhr = new XMLHttpRequest();
  updateUserXhr.open("PUT", `/address`, true);
  updateUserXhr.setRequestHeader("Content-type", "application/json");
  updateUserXhr.send(JSON.stringify(addressDetails));

  updateUserXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      getUserAddress();
    }
  };
}

function updatePassword() {
  if (currentPasswordEtx.value == addressDetails.user.password) {
    if (newPasswordEtx.value == confirmPasswordEtx.value) {
      userDetail.password = newPasswordEtx.value;
      let userPasswordXhr = new XMLHttpRequest();
      userPasswordXhr.open("PUT", "/user", true);
      userPasswordXhr.setRequestHeader("Content-type", "application/json");
      userPasswordXhr.send(JSON.stringify(userDetail));

      userPasswordXhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          let response = JSON.parse(this.response);
        }
      };
    }
  }
}

function getCryptos() {
  let cryptoXhr = new XMLHttpRequest();
  cryptoXhr.open("GET", "/cryptos", true);
  cryptoXhr.send();

  cryptoXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      console.log(response);
      response.forEach(function (item, index) {
        if (index == 0) {
        } else {
          document.getElementById("choose-crypto").innerHTML +=
            bindChooseCrypto(item);
        }
      });

      cryptos = response;
    }
  };
}

function bindSelect(id, value, selected) {
  return `<option value="${id}" ${selected}>${value}</option>`;
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function displayCryptoUpdateMobile(crypto, color, plus, direction) {
  return `<div class="w3-margin-bottom"><div class="w3-row">
  <div class="w3-col s1"><img src="${
    crypto.image
  }.png" style="width: 80%" ></div>
  <div class="w3-col s8">
    <p class="no-margin big">${crypto.name}</p>
    <p class="no-margin">(${crypto.symbol})</p>
  </div>
  <div class="w3-col s3">
    <p class="no-margin">$${crypto.current_price}</p>
    <p class="no-margin ${color}">${plus}${crypto.price_change_percentage_24h.toFixed(
      2,
    )}%
    <span class="fa fa-angle-${direction} color"></span>
    </p>
  </div>

</div>
	<hr style="margin: 10px 5px; border-width: 2px">
</div>`;
}
function displayCryptoUpdate(crypto, color, plus, direction) {
  return `<div>
	<div class="w3-row">
							<div class="w3-col l6">
								<div class="w3-row">
									<div class="w3-col s1 w3-center">
									<img src="${crypto.image}.png" style="width: 50%" >
									</div>
									<div class="w3-col s11">	
									<p class="big">${crypto.name}</p>
									<p class="small" style="margin: -8px 0px 8px; text-transform: uppercase">${
                    crypto.symbol
                  }</p>
									</div>
								</div>
							</div>
							<div class="w3-col s2">
								<div>
									<p class="big" style="margin-bottom: 25px; font-weight: 500;">$${numberWithCommas(
                    crypto.current_price,
                  )}</p>
								</div>
							</div>
							<div class="w3-col s2">
								<div>
									<p class="${color}" style="margin-bottom: 25px;">${plus}${crypto.price_change_percentage_24h.toFixed(
                    2,
                  )}%
									<span class="w3-padding-small fa fa-angle-${direction} color"></span>
									</p>
								</div>

							</div>
							<div class="w3-col s2">
								<div>
									<p>$${numberWithCommas(crypto.market_cap)}
									</p>
								</div>

							</div>
						</div>
						<hr style="margin: 0px 50px 8px 10px; border-width: 2px">
						</div>`;
}

function scEscape(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scStatusBadgeClass(status) {
  const value = String(status || "").toLowerCase();
  if (
    value === "successful" ||
    value === "completed" ||
    value === "active" ||
    value === "approved"
  ) {
    return "sc-badge-ok";
  }
  if (
    value === "declined" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "rejected"
  ) {
    return "sc-badge-no";
  }
  return "sc-badge-pending";
}

function scFormatDate(iso) {
  if (iso == null || iso === "") return "-";
  const raw = String(iso);
  /* A bare YYYY-MM-DD is parsed as UTC midnight, which rolls back a day in
     western time zones. Anchor it to local midnight instead. */
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + "T00:00:00" : raw);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scAmount(amount) {
  const value = Number(amount);
  if (!isFinite(value)) return "$0.00";
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/* The two lines a ledger row carries: the movement itself (Deposit or
   Withdrawal) and what it was booked against -- the plan for a deposit, the
   payout rail for a withdrawal. Anything that is not a deposit is rendered
   as a withdrawal, so an unexpected type still shows up honestly. */
function scTransactionKind(transaction) {
  return String(transaction.type || "").toLowerCase() === "deposit"
    ? "deposit"
    : "withdrawal";
}

function bindTransaction(transaction, index) {
  const kind = scTransactionKind(transaction);
  const title = kind === "deposit" ? "Deposit" : "Withdrawal";
  const status = transaction.status || "-";
  const label = transaction.label || "";
  /* The payout destination the member typed on the withdraw page. A long
     bank string is truncated by .sc-hist-tx-sub rather than widening the row. */
  const destination = transaction.walletAddress || "";

  const labelHtml = label
    ? `<span class="sc-hist-tx-sub">${scEscape(label)}</span>`
    : "";

  const destinationHtml = destination
    ? `<span class="sc-hist-tx-sub" title="${scEscape(destination)}">${scEscape(
        destination,
      )}</span>`
    : "";

  return `
    <div class="sc-hist-row">
      <div class="sc-hist-index">${index}</div>
      <div class="sc-hist-asset">
        <span class="sc-tx-chip sc-tx-chip-${kind}">${title}</span>
        ${labelHtml}
        ${destinationHtml}
      </div>
      <div class="sc-hist-amount">${scAmount(transaction.amount)}</div>
      <div class="sc-hist-status">
        <span class="sc-badge ${scStatusBadgeClass(status)}">${scEscape(status)}</span>
      </div>
      <div class="sc-hist-date">${scEscape(scFormatDate(transaction.date))}</div>
    </div>
  `;
}

/* The same row laid out for the dashboard's Transaction History card:
   icon and title, amount, then date and time. */
function bindTransactionCard(transaction) {
  const isDeposit = scTransactionKind(transaction) === "deposit";
  const status = transaction.status || "-";
  const label = transaction.label || "";

  const date = new Date(transaction.date);
  const hasDate = !isNaN(date.getTime());
  const datePart = hasDate
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
  const timePart = hasDate
    ? date
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase()
    : "";

  const statusLine = [label, status]
    .filter(Boolean)
    .map(scEscape)
    .join(" &middot; ");

  /* Payout destination the member typed on the withdraw page; the row is
     single-line and ellipsised so a long bank string cannot break the card. */
  const destination = transaction.walletAddress
    ? `<div class="tx-status" title="${scEscape(
        transaction.walletAddress,
      )}">${scEscape(transaction.walletAddress)}</div>`
    : "";

  return `
    <div class="tx-history-container">
      <div style="display: flex; align-items: center; min-width: 0;">
        <div class="tx-icon-container" style="background-color: ${
          isDeposit ? "#d8f3dc" : "#ffe8d6"
        };">
          <span class="fa ${
            isDeposit ? "fa-money" : "fa-credit-card"
          }" style="color: ${isDeposit ? "#40916c" : "#c97a3c"}; font-size: 20px;"></span>
        </div>
        <div style="min-width: 0;">
          <div class="tx-title">${isDeposit ? "Deposit" : "Withdrawal"}</div>
          <div class="tx-status">${statusLine}</div>
          ${destination}
        </div>
      </div>
      <div class="tx-amount">${scAmount(transaction.amount)}</div>
      <div class="tx-date-container">
        <div class="tx-date">${scEscape(datePart)}</div>
        ${
          timePart
            ? `<div class="tx-date">${scEscape(timePart)}</div>`
            : ""
        }
      </div>
    </div>
  `;
}

function bindWallet(wallet, index) {
  return `
    <div class="w3-row w3-padding-large w3-round" style="margin-top: 24px; background-color: rgb(248, 248, 248);">
                  <div class="w3-col s1">
                    ${index}.
                  </div>
                  <div class="w3-col s2">
                    <p class="no-margin">BITCOIN</p>
                  </div>
                  <div class="w3-col s8">
                    <p class="no-margin">
                      bc1qn8j4sj0zr0m8jg3ccc6ufw8as7hmfysfcncmx2
                    </p>
                    
                  </div>
                  <div class="w3-col s1">
                    <span class="fa fa-times w3-text-red w3-center"></span>
                  </div>
                </div>
    `;
}

function bindTransactionHeaderRoot() {
  /* Cells carry the same column classes as the body rows so the narrow
     layout (see the container query in dashboard-light.css) can restack
     header and rows identically. */
  return `
    <div class="sc-hist-row sc-hist-head">
      <div class="sc-hist-index">No</div>
      <div class="sc-hist-asset">Transaction</div>
      <div class="sc-hist-amount">Amount</div>
      <div class="sc-hist-status">Status</div>
      <div class="sc-hist-date">Date</div>
    </div>
  `;
}

/**
 * Loads the signed-in member's full ledger -- deposits merged with
 * withdrawals, newest first -- into both places that show it: the
 * Transaction History panel in settings and the Transaction History card on
 * the dashboard. One fetch for both so the two can never disagree.
 *
 * When there are no rows (or the endpoint is not deployed) each keeps its
 * static empty state: dashboard-light.css hides those as soon as the
 * matching root is populated.
 */
function getTransactions() {
  if (!userEmail) return;

  const historyRoot = document.getElementById("withdrawal-history-root");
  const cardRoot = document.getElementById("tx-card-root");

  const transactionsXhr = new XMLHttpRequest();
  /* Handler attached before send(): a reply can only arrive on a later
     event-loop turn, but wiring it first is the correct order and keeps the
     non-200 path (endpoint not deployed, session dropped) falling through to
     the static empty states instead of rendering a broken table. */
  transactionsXhr.onreadystatechange = function () {
    if (this.readyState !== 4 || this.status !== 200) return;

    let rows;
    try {
      rows = JSON.parse(this.response);
    } catch (error) {
      return;
    }
    if (!Array.isArray(rows) || rows.length === 0) return;

    /* The endpoint sorts newest first; rows are heterogeneous (a deposit has
       no withdrawalId), so there is nothing meaningful to re-sort here. */
    if (historyRoot) {
      let html = `<div class="sc-hist"><div class="sc-hist-scroll"><div class="sc-hist-inner">${bindTransactionHeaderRoot()}`;
      rows.forEach((row, index) => {
        html += bindTransaction(row, index + 1);
      });
      html += `</div></div></div>`;
      historyRoot.innerHTML = html;
    }

    if (cardRoot) {
      let cardHtml = "";
      rows.forEach((row) => {
        cardHtml += bindTransactionCard(row);
      });
      cardRoot.innerHTML = cardHtml;
    }
  };
  transactionsXhr.open("GET", `/user/${userEmail}/transactions`, true);
  transactionsXhr.send();
}

function bindWalletHeaderRoot() {
  return `
		<div class="w3-row w3-padding-large"
							style="margin-top: 24px;">
							<div class="w3-col s1">
								<p class="x-big no-margin blue-text-dash" style="font-weight: 500;">No</p>

							</div>
							<div class="w3-col s2">
								<p class="no-margin blue-text-dash x-big" style="font-weight: 500;">Wallet Name</p>
							</div>
							<div class="w3-col s9">
								<p class="no-margin blue-text-dash x-big" style="font-weight: 500;">Wallet Address</p>

							</div>

						</div>
	`;
}

function bindChooseCrypto(crypto) {
  return `
	<option value="${crypto.cryptoId}">${crypto.crypto}</option>
	`;
}

/* The settings screen is a fixed full-screen overlay (see
   dashboard-light.css), so the document behind it must not scroll. The
   class is driven by a style observer rather than by each toggle site so
   navBar.js stays in sync without duplicating the bookkeeping. It also
   wires the screen's own close control and Escape: the account chip that
   used to dismiss it lives in the desktop sidebar, which is hidden on
   smaller viewports. */
(function () {
  var settingsScreen = document.getElementById("app-settings");
  if (!settingsScreen) return;

  var syncLock = function () {
    document.documentElement.classList.toggle(
      "sc-settings-open",
      settingsScreen.style.display === "block",
    );
  };

  if (window.MutationObserver) {
    new MutationObserver(syncLock).observe(settingsScreen, {
      attributes: true,
      attributeFilter: ["style"],
    });
    syncLock();
  }

  var closeSettings = function () {
    settingsScreen.style.display = "none";
    isAppSetingsOpened = false;
    syncLock();
  };

  var closeButton = document.getElementById("close-app-settings");
  if (closeButton) {
    closeButton.addEventListener("click", closeSettings);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || settingsScreen.style.display !== "block") return;
    closeSettings();
  });
})();
