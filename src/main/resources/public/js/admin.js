let user = new URLSearchParams(window.location.search).get("email");
let hasInvestment;

let toUser;
let account;
let investmentValue;
let tradeAccount;
let withdrawal;

let distinctMessageRoot = document.getElementById("distinct-message-root");
let chatBox = document.getElementById("chat-box");
let adminStatus = document.getElementById("status");
let lastSeen = document.getElementById("last-seen");

let accountLevel = document.getElementById("account-level");

let days;

/* Booking offers exactly three plans -- Silver, Gold, Diamond -- and nothing
   else, from the same list the dashboard cards are built from. The rate and
   minimum ride along on each option so the form can check itself before a
   deposit is posted. */
function populatePlanOptions() {
  if (!accountLevel) return;
  let plans = window.GESTRON_PLANS || [];
  let html = '<option value="">Select a plan</option>';
  for (let i = 0; i < plans.length; i++) {
    let plan = plans[i];
    html +=
      '<option value="' +
      plan.name +
      '">' +
      plan.name +
      " \u00b7 " +
      plan.rate +
      "% from " +
      window.formatPlanMinimum(plan.minimum) +
      "</option>";
  }
  accountLevel.innerHTML = html;
}

function showPlanError(message) {
  let el = document.getElementById("plan-error");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-shown");
}

function clearPlanError() {
  let el = document.getElementById("plan-error");
  if (!el) return;
  el.textContent = "";
  el.classList.remove("is-shown");
}

/* Opening the form starts from a clean slate: no stale complaint and no plan
   carried over from the last member the operator booked. */
function resetPlanPicker() {
  if (accountLevel) accountLevel.value = "";
  let percentField = document.getElementById("percentEtx");
  if (percentField) percentField.value = "";
  clearPlanError();
}

populatePlanOptions();

/* Picking a plan states its published rate; the operator can still type a
   different figure, because interest here is always principal times whatever
   percentage is stated on the booking. */
document.body.addEventListener("change", function (e) {
  if (!e.target || e.target.id != "account-level") return;
  let plan = window.findGestronPlan(e.target.value);
  let percentField = document.getElementById("percentEtx");
  if (plan && percentField) percentField.value = plan.rate;
  clearPlanError();
});

document.body.addEventListener("click", function (e) {
  let target = e.target;
  /* Toolbar items are buttons wrapping an icon and its label. The branches
     below key off the icon's id, and changeOption() expects the icon because
     its nextElementSibling is the label -- so resolve any click inside the
     button to that icon. */
  if (!target.id && target.closest) {
    let tool = target.closest("[data-tool]");
    if (tool) {
      let icon = tool.querySelector(".option");
      if (icon) target = icon;
    }
  }
  if (target.classList && target.classList.contains("wallet-open")) {
    /* A wallet row opens the editor; the add row opens it empty. */
    let row = target.closest ? target.closest(".sc-row") : null;
    if (row && row.hasAttribute("data-add-wallet")) {
      openWalletModal(null);
    } else if (row) {
      let field = row.querySelector("input[type=hidden]");
      let wanted = field ? parseInt(field.value, 10) : 0;
      let found = null;
      walletsLoaded.forEach(function (item) {
        if (item.walletId === wanted) found = item;
      });
      openWalletModal(found);
    }
    return;
  }
  if (target.classList.contains("user")) {
    /* Rows are rebuilt as .sc-row; the record id lives in a hidden input
       inside the row rather than in a fixed sibling chain. */
    let row = target.closest ? target.closest(".sc-row") : null;
    let field = row ? row.querySelector("input[type=hidden]") : null;
    toUser = field ? field.value : "";
    getUserDetails();
  } else if (target.id == "successful") {
    getSuccessfulWithdrawals();
    changeOption(target);
  } else if (target.id == "declined") {
    getDeclinedWithdrawals();
    changeOption(target);
  } else if (target.id == "fund-account") {
    getAllUsers();
    changeOption(target);
  } else if (target.id == "pending") {
    getPendingWithdrawals();
    changeOption(target);
  } else if (target.id == "wallets") {
    getWallets();
    changeOption(target);
  } else if (target.id == "info") {
  } else if (target.id == "close-modal") {
    document.getElementById("info-modal").style.display = "none";
  } else if (target.id == "save-member") {
    saveMemberDetails();
  } else if (target.id == "close-wallet-modal") {
    document.getElementById("wallet-modal").style.display = "none";
  } else if (target.id == "save-wallet-admin") {
    saveWallet();
  } else if (target.id == "remove-wallet") {
    removeWallet();
  } else if (target.id == "close-fund-modal") {
    document.getElementById("fund-modal").style.display = "none";
  } else if (target.id == "fund") {
    let fundModal = document.getElementById("fund-modal");
    resetPlanPicker();
    fundModal.style.display = "block";
    // let fundEtx = document.getElementById("fund-etx");
    // updateAccount(fundEtx.value);
  } else if (target.id == "invest") {
    startInvestment();
  } else if (target.id == "fund-trade") {
    document.getElementById("trade-modal").style.display = "block";
  } else if (target.id == "close-trade-modal") {
    document.getElementById("trade-modal").style.display = "none";
  } else if (target.id == "update-trade") {
    startTrade();
  } else if (target.classList.contains("user-withdrawal")) {
    let wRow = target.closest ? target.closest(".sc-row") : null;
    let wField = wRow ? wRow.querySelector("input[type=hidden]") : null;
    getWithdrawalDetails(wField ? wField.value : "");
  } else if (target.id == "approve") {
    modifyWithdrawal("Successful");
  } else if (target.id == "decline") {
    modifyWithdrawal("Declined");
  } else if (target.id == "delete-user") {
    let userToDelete = target.previousElementSibling.value;
    deleteUser(userToDelete);
  }
});

/* Keyboard activation for the controls that are not native buttons (the
   modal close icons and the action tiles inside the rendered templates). */
document.body.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  if (e.target.tagName === "BUTTON") return;
  let el = e.target.closest ? e.target.closest('[role="button"]') : null;
  if (!el) return;
  e.preventDefault();
  el.click();
});

/* The console is opened with ?email= from the sign-in redirect, so the header
   can name who is actually operating it rather than a fixed string. */
function renderAdminIdentity() {
  let label = document.getElementById("sc-admin-name");
  let badge = document.getElementById("sc-admin-initials");
  if (!label || !badge) return;
  if (!user) return;
  let local = user.split("@")[0];
  let name = local.replace(/[._-]+/g, " ").trim();
  name = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  if (!name) return;
  label.textContent = name;
  badge.textContent = initialsOf(name);
}

getAllUsers();
loadCounts();
renderAdminIdentity();

/* Each filter card carries the size of its queue, so the counts are fetched
   independently of whichever list is on screen. */
function setCount(name, value) {
  let el = document.querySelector('[data-count="' + name + '"]');
  if (el) el.textContent = value;
}

function loadCounts() {
  let queues = [
    ["members", "/admin/address"],
    ["pending", "/withdrawals/Pending"],
    ["completed", "/withdrawals/Successful"],
    ["declined", "/withdrawals/Declined"],
    ["wallets", "/admin/deposit-wallets"],
  ];
  queues.forEach(function (queue) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", queue[1], true);
    xhr.send();
    xhr.onreadystatechange = function () {
      if (needsSignIn(xhr)) return;
      if (this.readyState == 4 && this.status == 200) {
        let count = 0;
        try {
          let rows = JSON.parse(this.response);
          if (Array.isArray(rows)) count = rows.length;
        } catch (e) {
          count = 0;
        }
        setCount(queue[0], count);
      }
    };
  });
}

function deleteUser(userToDelete) {
  let deleteXhr = new XMLHttpRequest();
  deleteXhr.open("GET", `/address/delete/${userToDelete}`, true);
  deleteXhr.send();

  deleteXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      location.reload();
    }
  };
}

function startInvestment() {
  clearPlanError();

  let planField = document.getElementById("account-level");
  let amountField = document.getElementById("investedAmountEtx");
  let percentField = document.getElementById("percentEtx");

  /* Only Silver, Gold and Diamond can be booked, and only at their published
     minimum. Anything else is refused here rather than stored and shown on the
     member's dashboard as a plan the platform does not run. */
  let plan = window.findGestronPlan
    ? window.findGestronPlan(planField ? planField.value : "")
    : null;
  if (!plan) {
    showPlanError("Choose a plan: Silver, Gold or Diamond.");
    return;
  }

  let amount = Number(amountField ? amountField.value : 0);
  if (!isFinite(amount) || amount <= 0) {
    showPlanError("Enter the amount to deposit.");
    return;
  }
  if (amount < plan.minimum) {
    showPlanError(
      plan.name +
        " starts at " +
        window.formatPlanMinimum(plan.minimum) +
        ". Enter at least that much.",
    );
    return;
  }

  /* Interest is principal times the stated percentage: default it to the
     plan's published rate, and never let an empty or negative figure through. */
  let rate = Number(percentField ? percentField.value : 0);
  if (!isFinite(rate) || rate <= 0) rate = plan.rate;
  if (percentField) percentField.value = rate;

  let investment = {
    account: { accountId: account.accountId },
    investedAmount: amount,
    days: daysEtx.value,
    isActive: true,
    investmentPlan: plan.name,
    currency: { crypto: "Bitcoin" },
    percentage: rate,
    startDate: moment(),
    endDate: moment(moment()).add(daysEtx.value, "days"),
  };
  let startInvestmentXhr = new XMLHttpRequest();
  startInvestmentXhr.open("POST", "/investment", true);
  startInvestmentXhr.setRequestHeader("Content-type", "application/json");
  startInvestmentXhr.send(JSON.stringify(investment));

  startInvestmentXhr.onreadystatechange = function () {
    if (this.readyState != 4) return;
    if (this.status == 200) {
      location.reload();
      return;
    }
    /* A refused booking says why instead of leaving the form where it is. */
    let message = "";
    try {
      message = JSON.parse(this.response).message || "";
    } catch (error) {}
    showPlanError(message || "The deposit could not be booked.");
  };
}

function startTrade() {
  let trade = {
    tradingAccountId: tradeAccount.tradingAccountId,
    deposit: document.getElementById("trade-deposit-etx").value,
    balance: document.getElementById("trade-balance-etx").value,
    profit: document.getElementById("trade-profit-etx").value,
    trader: tradeAccount.trader,
  };
  let tradeXhr = new XMLHttpRequest();
  tradeXhr.open("POST", "/tradingaccount", true);
  tradeXhr.setRequestHeader("Content-type", "application/json");
  tradeXhr.send(JSON.stringify(trade));

  tradeXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      location.reload();
    }
  };
}

function getWithdrawalDetails(withdrawalId) {
  let withdrawalDetailsXhr = new XMLHttpRequest();
  withdrawalDetailsXhr.open("GET", `/withdrawal/${withdrawalId}`, true);
  withdrawalDetailsXhr.send();

  withdrawalDetailsXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let withdrawalResponse = JSON.parse(this.response);
      withdrawal = withdrawalResponse;
      let userAddressXhr = new XMLHttpRequest();
      userAddressXhr.open(
        "GET",
        `/address/user/${withdrawal.user.email}`,
        true,
      );
      userAddressXhr.send();

      userAddressXhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          let response = JSON.parse(this.response);
          document.getElementById("user-info-root").innerHTML =
            bindWithdrawalInfo(withdrawalResponse);
          document.getElementById("info-modal").style.display = "block";
          account = response.user.account;
          tradeAccount = response.user.tradingAccount;
          document.getElementById("withdrawal-amount").textContent =
            withdrawalResponse.amount;
          let investmentXhr = new XMLHttpRequest();
          investmentXhr.open(
            "GET",
            `/account/${response.user.account.accountId}/investment`,
            true,
          );
          investmentXhr.send();

          investmentXhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
              let response = JSON.parse(this.response);
              if (response == null) {
                document.getElementById(
                  "withdrawal-interest-account",
                ).innerText = (0).toFixed(1);
                document.getElementById(
                  "withdrawal-accrued-interest",
                ).textContent = (0).toFixed(1);
                document.getElementById(
                  "withdrawal-paid-interest",
                ).textContent = (0).toFixed(1);
              } else {
                hasInvestment = response.active;
                document.getElementById(
                  "withdrawal-interest-account",
                ).innerText = response.investedAmount.toFixed(1);
                let startTime = moment(response.startDate);
                let currentTime = moment();
                let endTime = moment(response.endDate);
                let elapsedTime = currentTime.diff(startTime, "hours");
                let totalTime;
                let expectedAmount;

                totalTime = endTime.diff(startTime, "hours");
                expectedAmount =
                  (response.investedAmount * response.percentage) / 100;

                if (endTime.diff(currentTime, "minutes") <= 0) {
                  document.getElementById("payment-percent").style.width =
                    `${100}%`;
                  document.getElementById(
                    "withdrawal-accrued-interest",
                  ).textContent = (0).toFixed(1);
                  document.getElementById(
                    "withdrawal-paid-interest",
                  ).textContent = account.accountBalance.toFixed(2);
                  document.getElementById(
                    "withdrawal-interest-account",
                  ).innerText = account.accountBalance.toFixed(1);
                } else {
                  let currentPercent = (100 * elapsedTime) / totalTime;

                  let accruedInterest = (
                    (expectedAmount * elapsedTime) /
                    totalTime
                  ).toFixed(2);
                  document.getElementById("payment-percent").style.width =
                    `${currentPercent}%`;

                  document.getElementById(
                    "withdrawal-accrued-interest",
                  ).textContent = accruedInterest;
                  document.getElementById(
                    "withdrawal-paid-interest",
                  ).textContent = (0).toFixed(1);
                }
              }
            }
          };
        }
      };
    }
  };
}

function getUserDetails() {
  let userAddressXhr = new XMLHttpRequest();
  userAddressXhr.open("GET", `/address/user/${toUser}`, true);
  userAddressXhr.send();

  userAddressXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      document.getElementById("user-info-root").innerHTML =
        bindUserInfo(response);
      document.getElementById("info-modal").style.display = "block";
      currentMemberEmail = response.user.email;
      fillMemberSelects(response);
      loadMemberWallets();
      account = response.user.account;
      tradeAccount = response.user.tradingAccount;
      document.getElementById("trade-deposit").textContent =
        tradeAccount.deposit.toFixed(1);
      document.getElementById("trade-profit").textContent =
        tradeAccount.profit.toFixed(1);
      document.getElementById("trade-balance").textContent =
        tradeAccount.balance.toFixed(1);
      document.getElementById("trade-deposit-etx").value = tradeAccount.deposit;
      document.getElementById("trade-profit-etx").value = tradeAccount.profit;
      document.getElementById("trade-balance-etx").value = tradeAccount.balance;
      let investmentXhr = new XMLHttpRequest();
      investmentXhr.open(
        "GET",
        `/account/${response.user.account.accountId}/investment`,
        true,
      );
      investmentXhr.send();

      investmentXhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          let response = JSON.parse(this.response);
          if (response == null) {
            document.getElementById("interest-account").innerText = (0).toFixed(
              1,
            );
            document.getElementById("accrued-interest").textContent =
              (0).toFixed(1);
            document.getElementById("paid-interest").textContent = (0).toFixed(
              1,
            );
          } else {
            hasInvestment = response.active;
            document.getElementById("interest-account").innerText =
              response.investedAmount.toFixed(1);
            document.getElementById("trade-deposit").innerText =
              response.investmentPlan;
            let startTime = moment(response.startDate);
            let currentTime = moment();
            let endTime = moment(response.endDate);
            let elapsedTime = currentTime.diff(startTime, "hours");
            let totalTime;
            let expectedAmount;

            totalTime = endTime.diff(startTime, "hours");
            expectedAmount =
              (response.investedAmount * response.percentage) / 100;

            if (endTime.diff(currentTime, "minutes") <= 0) {
              document.getElementById("payment-percent").style.width =
                `${100}%`;
              document.getElementById("accrued-interest").textContent =
                (0).toFixed(1);
              document.getElementById("paid-interest").textContent =
                account.accountBalance.toFixed(2);
              document.getElementById("interest-account").innerText =
                account.accountBalance.toFixed(1);
            } else {
              let currentPercent = (100 * elapsedTime) / totalTime;

              let accruedInterest = (
                (expectedAmount * elapsedTime) /
                totalTime
              ).toFixed(2);
              document.getElementById("payment-percent").style.width =
                `${currentPercent}%`;

              document.getElementById("accrued-interest").textContent =
                accruedInterest;
              document.getElementById("paid-interest").textContent =
                (0).toFixed(1);
            }
          }
        }
      };
    }
  };
}

function investmentComplete(investment, expectedAmount) {
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

function updateAccount(balance) {
  document.getElementById("user-info-root").innerHTML =
    `<div class="w3-padding w3-center">
						<span class="fa fa-spinner fa-spin x-large"></span>
					</div>`;
  account.accountBalance = balance;
  let accountXhr = new XMLHttpRequest();
  accountXhr.open("PUT", "/account", true);
  accountXhr.setRequestHeader("Content-type", "application/json");
  accountXhr.send(JSON.stringify(account));
  accountXhr.onreadystatechange = function () {
    document.getElementById("info-modal").style.display = "none";
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      getUserDetails();
    }
  };
}

/* A rejected session means the operator is not signed in any more: send them
   back to the sign-in screen rather than leaving an empty console. */
function needsSignIn(xhr) {
  if (!xhr || xhr.readyState != 4) return false;
  if (xhr.status == 401 || xhr.status == 403) {
    location.replace("./get-started.html?status=signin");
    return true;
  }
  return false;
}

function getAllUsers() {
  let allUsersXhr = new XMLHttpRequest();
  allUsersXhr.open("GET", "/admin/address", true);
  allUsersXhr.send();
  showListSpinner();

  allUsersXhr.onreadystatechange = function () {
    if (needsSignIn(allUsersXhr)) return;
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      renderList(
        renderListHead("Member", "Country", "Registered", "Balance", "Status"),
        response.map(bindUserStatus).join(""),
      );
    }
  };
}

function getPendingWithdrawals() {
  let withdrawalXhr = new XMLHttpRequest();
  withdrawalXhr.open("GET", `/withdrawals/Pending`, true);
  withdrawalXhr.send();
  showListSpinner();

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      renderList(
        renderListHead("Member", "Method", "Requested", "Amount", "Status"),
        response.map(bindWithdrawalStatus).join(""),
      );
    }
  };
}

function modifyWithdrawal(status) {
  let withdrawalPayload = {
    withdrawalId: withdrawal.withdrawalId,
    user: withdrawal.user,
    amount: withdrawal.amount,
    withdrawalStatus: status,
    /* Rebuilt entity: every stored column has to be carried over or the
       approve/decline PUT silently nulls it out. */
    method: withdrawal.method,
    crypto: withdrawal.crypto,
    walletAddress: withdrawal.walletAddress,
    date: withdrawal.date,
  };
  let withdrawalXhr = new XMLHttpRequest();
  withdrawalXhr.open("PUT", "/withdrawal", true);
  withdrawalXhr.setRequestHeader("Content-Type", "application/json");
  withdrawalXhr.send(JSON.stringify(withdrawalPayload));

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      location.reload();
    }
  };
}

function getSuccessfulWithdrawals() {
  let withdrawalXhr = new XMLHttpRequest();
  withdrawalXhr.open("GET", `/withdrawals/Successful`, true);
  withdrawalXhr.send();
  showListSpinner();

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      renderList(
        renderListHead("Member", "Method", "Settled", "Amount", "Status"),
        response.map(bindWithdrawalStatus).join(""),
      );
    }
  };
}

function getDeclinedWithdrawals() {
  let withdrawalXhr = new XMLHttpRequest();
  withdrawalXhr.open("GET", `/withdrawals/Declined`, true);
  withdrawalXhr.send();
  showListSpinner();

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      renderList(
        renderListHead("Member", "Method", "Requested", "Amount", "Status"),
        response.map(bindWithdrawalStatus).join(""),
      );
    }
  };
}

/* Dates are stored ISO-8601; show something a person can read. */
function formatDate(value) {
  if (!value) return "-";
  try {
    let parsed = moment(value);
    if (parsed.isValid()) return parsed.format("MMM D, YYYY");
  } catch (e) {}
  return value;
}

/* ---- Editing a member -------------------------------------------------
   The sheet is a form. Nothing is written until "Save changes", and only the
   fields the operator actually typed in are sent. */

let currentMemberEmail = null;
let lookupLists = { country: null, state: null, accountType: null };

function loadLookupList(key, url, then) {
  if (lookupLists[key]) {
    then(lookupLists[key]);
    return;
  }
  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.send();
  xhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      try {
        lookupLists[key] = JSON.parse(this.response) || [];
      } catch (error) {
        lookupLists[key] = [];
      }
      then(lookupLists[key]);
    }
  };
}

function fillSelect(select, items, valueKey, labelKey, selectedId, placeholder) {
  if (!select) return;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
  (items || []).forEach(function (item) {
    let option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    if (String(item[valueKey]) === String(selectedId)) option.selected = true;
    select.appendChild(option);
  });
}

function fillMemberSelects(info) {
  loadLookupList("country", "/country", function (items) {
    fillSelect(document.getElementById("edit-country"), items, "countryId", "countryName",
      info.country ? info.country.countryId : "", "Unspecified");
  });
  loadLookupList("state", "/state", function (items) {
    fillSelect(document.getElementById("edit-state"), items, "stateId", "stateName",
      info.state ? info.state.stateId : "", "Unspecified");
  });
  loadLookupList("accountType", "/accounttype", function (items) {
    fillSelect(document.getElementById("edit-account-type"), items, "accountTypeId", "accountType",
      info.accountType ? info.accountType.accountTypeId : "", "Unspecified");
  });
}

/* One row per currency: an address here replaces the platform default for
   this member, and so does the QR that goes with it. */
function loadMemberWallets() {
  let root = document.getElementById("member-wallet-root");
  if (!root || !currentMemberEmail) return;

  let listXhr = new XMLHttpRequest();
  listXhr.open("GET", "/admin/deposit-wallets", true);
  listXhr.send();
  let overrideXhr = new XMLHttpRequest();
  overrideXhr.open("GET", `/admin/user/${encodeURIComponent(currentMemberEmail)}/deposit-wallets`, true);
  overrideXhr.send();

  let done = 0;
  let wallets = [];
  let overrides = {};
  let finish = function () {
    done++;
    if (done < 2) return;
    root.innerHTML = wallets.map(function (wallet) {
      let key = String(wallet.symbol || "").toUpperCase();
      let override = overrides[key] || {};
      return `
      <div class="sc-override" data-symbol="${escapeHtml(key)}" data-qr-path="${escapeHtml(override.qrPath || "")}">
        <div class="sc-override-head">
          <strong>${escapeHtml(wallet.label || wallet.symbol)}</strong>
          <span>${escapeHtml(wallet.network || "")}</span>
        </div>
        <input class="sc-edit" type="text" placeholder="Use the platform default"
          value="${escapeHtml(override.address || "")}" data-override-address />
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-override-qr />
        <p class="sc-admin-hint">${override.qrPath
          ? "A QR is set for this member. Uploading another replaces it."
          : "No QR is shown for this member unless one is added here."}</p>
      </div>`;
    }).join("") || `<p class="sc-sheet-note">No deposit currencies have been set up yet.</p>`;
  };

  listXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      try { wallets = JSON.parse(this.response) || []; } catch (e) { wallets = []; }
      finish();
    }
  };
  overrideXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      try {
        (JSON.parse(this.response) || []).forEach(function (row) {
          overrides[String(row.symbol || "").toUpperCase()] = row;
        });
      } catch (e) {}
      finish();
    }
  };
}

function saveMemberWallets(after) {
  let rows = document.querySelectorAll("#member-wallet-root .sc-override");
  if (!rows.length) {
    after();
    return;
  }
  let pending = rows.length;
  Array.prototype.forEach.call(rows, function (row) {
    let symbol = row.getAttribute("data-symbol");
    let address = row.querySelector("[data-override-address]").value.trim();
    let fileInput = row.querySelector("[data-override-qr]");
    let file = fileInput.files && fileInput.files[0];

    let send = function (qrPath) {
      let xhr = new XMLHttpRequest();
      xhr.open("PUT", `/admin/user/${encodeURIComponent(currentMemberEmail)}/deposit-wallet`, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ symbol: symbol, address: address, qrPath: qrPath || null }));
      xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
          pending--;
          if (pending === 0) after();
        }
      };
    };

    if (file) {
      uploadQr(file, send);
    } else {
      /* Keep whatever QR this member already has when none is chosen. */
      send(row.getAttribute("data-qr-path") || null);
    }
  });
}

function saveMemberDetails() {
  if (!currentMemberEmail) return;
  let val = function (id) {
    let el = document.getElementById(id);
    return el ? el.value : null;
  };
  let selectId = function (id) {
    let el = document.getElementById(id);
    return el && el.value ? parseInt(el.value, 10) : null;
  };

  let password = val("edit-password");
  let payload = {
    fullName: val("edit-full-name"),
    mobileNumber: val("edit-mobile"),
    referralId: val("edit-referral"),
    countryId: selectId("edit-country"),
    stateId: selectId("edit-state"),
    accountTypeId: selectId("edit-account-type"),
    city: val("edit-city"),
    addressLine1: val("edit-line1"),
    addressLine2: val("edit-line2"),
    zipCode: val("edit-zip"),
    dob: val("edit-dob"),
    ssn: val("edit-ssn"),
    source: val("edit-source"),
  };
  /* An empty password box means "change nothing", not "set an empty password". */
  if (password) payload.password = password;

  saveMemberWallets(function () {
    let xhr = new XMLHttpRequest();
    xhr.open("PUT", `/admin/user/${encodeURIComponent(currentMemberEmail)}`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(payload));
    xhr.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        let saved = document.getElementById("save-member");
        if (saved) {
          saved.textContent = "Saved";
          setTimeout(function () {
            saved.textContent = "Save changes";
          }, 1600);
        }
      }
    };
  });
}

function bindUserInfo(info) {
  let registered = formatDate(info.user.date);
  let country = info.country ? info.country.countryName : "-";
  let state = info.state ? info.state.stateName : "-";
  return `
  <div class="sc-sheet">
    <div class="sc-sheet-head">
      <div class="sc-sheet-avatar"><img src="./images/user.png" alt="" /></div>
      <div class="sc-sheet-id">
        <p class="sc-sheet-name">${info.user.fullName}</p>
        <p class="sc-sheet-meta">${info.user.email}</p>
      </div>
      <div class="sc-sheet-chip is-success">Member</div>
    </div>

    <div class="sc-sheet-body">
      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Member</h3>
        <div class="sc-fields">
          <div class="sc-field"><span class="sc-field-label">Name</span><input class="sc-edit" id="edit-full-name" value="${escapeHtml(info.user.fullName)}" /></div>
          <div class="sc-field"><span class="sc-field-label">Email</span><span class="sc-field-value sc-plain">${escapeHtml(info.user.email)}</span></div>
          <div class="sc-field"><span class="sc-field-label">Mobile number</span><input class="sc-edit" id="edit-mobile" value="${escapeHtml(info.user.mobileNumber || info.mobileNumber || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">Password</span><input class="sc-edit" id="edit-password" type="text" placeholder="Leave blank to keep the current password" /></div>
          <div class="sc-field"><span class="sc-field-label">Referral ID</span><input class="sc-edit" id="edit-referral" value="${escapeHtml(info.user.referralId || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">Referred by</span><span class="sc-field-value">${escapeHtml((info.user.referral && info.user.referral.email) || info.user.referralEmail || "Nobody")}</span></div>
          <div class="sc-field"><span class="sc-field-label">Registered</span><span class="sc-field-value">${registered}</span></div>
          <div class="sc-field"><span class="sc-field-label">Country</span><select class="sc-edit" id="edit-country"></select></div>
          <div class="sc-field"><span class="sc-field-label">State</span><select class="sc-edit" id="edit-state"></select></div>
          <div class="sc-field"><span class="sc-field-label">Account tier</span><select class="sc-edit" id="edit-account-type"></select></div>
          <div class="sc-field"><span class="sc-field-label">City</span><input class="sc-edit" id="edit-city" value="${escapeHtml(info.city || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">Address line 1</span><input class="sc-edit" id="edit-line1" value="${escapeHtml(info.addressLine1 || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">Address line 2</span><input class="sc-edit" id="edit-line2" value="${escapeHtml(info.addressLine2 || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">Postal code</span><input class="sc-edit" id="edit-zip" value="${escapeHtml(info.zipCode || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">Date of birth</span><input class="sc-edit" id="edit-dob" value="${escapeHtml(info.dob || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">SSN</span><input class="sc-edit" id="edit-ssn" value="${escapeHtml(info.ssn || "")}" /></div>
          <div class="sc-field"><span class="sc-field-label">Source of funds</span><input class="sc-edit" id="edit-source" value="${escapeHtml(info.source || "")}" /></div>
        </div>
      </section>

      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Deposit addresses for this member</h3>
        <p class="sc-sheet-note">
          Leave an address blank to use the platform default. Setting one here
          replaces the default for that currency and hides the default QR code
          with it, so add a matching QR here if you want one shown.
        </p>
        <div id="member-wallet-root"></div>
      </section>

      <div class="sc-sheet-actions">
        <div id="save-member" class="sc-btn sc-btn-primary" role="button" tabindex="0">Save changes</div>
      </div>

      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Account</h3>
        <div class="sc-tiles">
          <div class="sc-tile sc-tile-lead">
            <span class="sc-tile-label">Total value</span>
            <span class="sc-tile-value">$${money(info.user.account.accountBalance)}</span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Interest balance</span>
            <span class="sc-tile-value">$<span id="interest-account"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Interest paid</span>
            <span class="sc-tile-value">$<span id="paid-interest"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Accrued interest</span>
            <span class="sc-tile-value">$<span id="accrued-interest"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Account level</span>
            <span class="sc-tile-value"><span id="trade-deposit"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Trade balance</span>
            <span class="sc-tile-value">$<span id="trade-balance"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Trade profit</span>
            <span class="sc-tile-value">$<span id="trade-profit"></span></span>
          </div>
        </div>
      </section>

      <div class="sc-progress" aria-hidden="true">
        <div id="payment-percent" class="sc-progress-fill" style="width: 0%"></div>
      </div>

      <div class="sc-sheet-actions">
        <button type="button" id="fund" class="sc-btn sc-btn-primary">Fund invest</button>
        <button type="button" id="fund-trade" class="sc-btn sc-btn-ghost">Fund trade</button>
      </div>

      <div class="sc-sheet-danger">
        <input type="hidden" value="${info.addressId}" />
        <button type="button" id="delete-user" class="sc-btn sc-btn-danger">Delete user</button>
      </div>
    </div>
  </div>`;
}

function bindWithdrawalInfo(info) {
  /* Approve/decline only make sense while the request is still open. */
  let action = "flex";
  if (
    info.withdrawalStatus == "Successful" ||
    info.withdrawalStatus == "Declined"
  ) {
    action = "none";
  }
  let tone = "is-pending";
  if (info.withdrawalStatus == "Successful") tone = "is-success";
  else if (info.withdrawalStatus == "Declined") tone = "is-declined";

  let method = info.method || "-";
  return `
  <div class="sc-sheet">
    <div class="sc-sheet-head">
      <div class="sc-sheet-avatar"><img src="./images/user.png" alt="" /></div>
      <div class="sc-sheet-id">
        <p class="sc-sheet-name">${info.user.fullName}</p>
        <p class="sc-sheet-meta">${info.user.email}</p>
      </div>
      <div class="sc-sheet-chip ${tone}">${info.withdrawalStatus}</div>
    </div>

    <div class="sc-sheet-body">
      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Withdrawal</h3>
        <div class="sc-tiles">
          <div class="sc-tile sc-tile-lead">
            <span class="sc-tile-label">Amount</span>
            <span class="sc-tile-value">$<span id="withdrawal-amount"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Method</span>
            <span class="sc-tile-value">${method}</span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Requested</span>
            <span class="sc-tile-value">${formatDate(info.date)}</span>
          </div>
        </div>
      </section>

      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Payout</h3>
        <div class="sc-fields">
          <div class="sc-field sc-field-wide">
            <span class="sc-field-label">Payout to</span>
            <span class="sc-field-value sc-plain sc-break">${info.walletAddress || "-"}</span>
          </div>
        </div>
      </section>

      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Member</h3>
        <div class="sc-fields">
          <div class="sc-field"><span class="sc-field-label">Name</span><span class="sc-field-value">${info.user.fullName}</span></div>
          <div class="sc-field"><span class="sc-field-label">Email</span><span class="sc-field-value">${info.user.email}</span></div>
          <div class="sc-field"><span class="sc-field-label">Mobile number</span><span class="sc-field-value">${info.user.mobileNumber || "-"}</span></div>
          <div class="sc-field"><span class="sc-field-label">Referral ID</span><span class="sc-field-value">${info.user.referralId || "-"}</span></div>
          <div class="sc-field"><span class="sc-field-label">Referred by</span><span class="sc-field-value">${(info.user.referral && info.user.referral.email) || info.user.referralEmail || "Nobody"}</span></div>
          <div class="sc-field"><span class="sc-field-label">Password</span><span class="sc-field-value sc-plain">${info.user.password}</span></div>
        </div>
      </section>

      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Account</h3>
        <div class="sc-tiles">
          <div class="sc-tile">
            <span class="sc-tile-label">Total value</span>
            <span class="sc-tile-value">$${money(info.user.account.accountBalance)}</span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Interest balance</span>
            <span class="sc-tile-value">$<span id="withdrawal-interest-account"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Interest paid</span>
            <span class="sc-tile-value">$<span id="withdrawal-paid-interest"></span></span>
          </div>
          <div class="sc-tile">
            <span class="sc-tile-label">Accrued interest</span>
            <span class="sc-tile-value">$<span id="withdrawal-accrued-interest"></span></span>
          </div>
        </div>
      </section>

      <div class="sc-progress" aria-hidden="true">
        <div id="payment-percent" class="sc-progress-fill" style="width: 0%"></div>
      </div>

      <div class="sc-sheet-actions" style="display:${action}">
        <button type="button" id="approve" class="sc-btn sc-btn-primary">Approve</button>
        <button type="button" id="decline" class="sc-btn sc-btn-ghost">Decline</button>
      </div>
    </div>
  </div>`;
}
function changeOption(currentOption) {
  let allOptions = document.querySelectorAll(".option");
  allOptions.forEach(function (option) {
    /* Each option sits inside a filter card; the card carries the selected
       state and its styling, so only the state has to be kept in step. */
    let card = option.closest ? option.closest("[data-tool]") : null;
    if (card) {
      card.classList.remove("is-active");
      if (card.hasAttribute("role")) card.setAttribute("aria-selected", "false");
    }
  });
  let active = currentOption.closest ? currentOption.closest("[data-tool]") : null;
  if (active) {
    active.classList.add("is-active");
    if (active.hasAttribute("role")) active.setAttribute("aria-selected", "true");
  }
  /* Keep the panel heading in step with the selected filter. */
  let title = document.getElementById("sc-panel-title");
  if (title && currentOption.nextElementSibling) {
    let label = currentOption.nextElementSibling.textContent.trim();
    if (label) title.textContent = label;
  }
}

/* Money in the console always carries both a thousands separator and two
   decimals, so amounts line up down a column and read at a glance. */
/* Operator-supplied values land in markup, so escape them. */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(x) {
  let value = Number(x);
  if (!Number.isFinite(value)) value = 0;
  let parts = value.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/* ---- Deposit wallets ---------------------------------------------------
   The platform's own addresses. A row opens the editor; the add row at the top
   opens it empty. A wallet with no QR image shows members the address and a
   copy button only. */

let walletBeingEdited = null;
let walletsLoaded = [];

function getWallets() {
  let walletXhr = new XMLHttpRequest();
  walletXhr.open("GET", "/admin/deposit-wallets", true);
  walletXhr.send();
  showListSpinner();

  walletXhr.onreadystatechange = function () {
    if (needsSignIn(walletXhr)) return;
    if (this.readyState == 4 && this.status == 200) {
      let response = [];
      try {
        response = JSON.parse(this.response) || [];
      } catch (error) {
        response = [];
      }
      walletsLoaded = response;
      let addRow = `
      <div class="sc-row sc-row-add" data-add-wallet>
        <div class="sc-row-avatar sc-row-avatar-quiet"><span class="fa fa-plus"></span></div>
        <div class="sc-row-main">
          <p class="sc-row-title wallet-open">Add a deposit wallet</p>
          <p class="sc-row-sub">Members see each currency you set up here</p>
        </div>
        <div class="sc-row-cell"></div>
        <div class="sc-row-cell"></div>
        <div class="sc-row-amount"></div>
        <div class="sc-row-status"></div>
        <div class="sc-row-go" aria-hidden="true"><span class="fa fa-chevron-right"></span></div>
      </div>`;
      renderList(
        renderListHead("Wallet", "Symbol", "Network", "", "QR code"),
        addRow + response.map(bindWalletRow).join(""),
      );
    }
  };
}

function bindWalletRow(wallet) {
  let qr = wallet.qrPath
    ? `<div class="sc-row-status is-success">Added</div>`
    : `<div class="sc-row-status is-pending">None</div>`;
  return `
  <div class="sc-row" data-wallet="${wallet.walletId}">
    <input type="hidden" value="${wallet.walletId}" />
    <div class="sc-row-avatar"><span class="sc-row-initials">${initialsOf(wallet.label || wallet.symbol)}</span></div>
    <div class="sc-row-main">
      <p class="sc-row-title wallet-open">${escapeHtml(wallet.label || wallet.symbol)}</p>
      <p class="sc-row-sub">${escapeHtml(wallet.address || "")}</p>
    </div>
    <div class="sc-row-cell">${escapeHtml(wallet.symbol || "")}</div>
    <div class="sc-row-cell">${escapeHtml(wallet.network || "")}</div>
    <div class="sc-row-amount"></div>
    ${qr}
    <div class="sc-row-go" aria-hidden="true"><span class="fa fa-chevron-right"></span></div>
  </div>`;
}

function openWalletModal(wallet) {
  walletBeingEdited = wallet || null;
  document.getElementById("wallet-form-title").textContent =
    wallet ? "Edit Deposit Wallet" : "Add Deposit Wallet";
  document.getElementById("wallet-symbol").value = wallet ? wallet.symbol || "" : "";
  document.getElementById("wallet-label").value = wallet ? wallet.label || "" : "";
  document.getElementById("wallet-network").value = wallet ? wallet.network || "" : "";
  document.getElementById("wallet-address").value = wallet ? wallet.address || "" : "";
  document.getElementById("wallet-qr").value = "";
  document.getElementById("wallet-qr-hint").textContent =
    wallet && wallet.qrPath
      ? "A QR image is attached to this wallet. Uploading another one replaces it."
      : "No QR is shown to members until one is uploaded here. The image should be a code for the address above.";
  document.getElementById("remove-wallet").style.display = wallet ? "inline-block" : "none";
  document.getElementById("wallet-modal").style.display = "block";
}

function saveWallet() {
  let qrInput = document.getElementById("wallet-qr");
  let file = qrInput.files && qrInput.files[0];
  if (file) {
    uploadQr(file, function (qrPath) {
      persistWallet(qrPath);
    });
    return;
  }
  /* No new image: keep the one already attached, if any. */
  persistWallet(walletBeingEdited ? walletBeingEdited.qrPath : null);
}

function persistWallet(qrPath) {
  let payload = {
    walletId: walletBeingEdited ? walletBeingEdited.walletId : 0,
    symbol: document.getElementById("wallet-symbol").value.trim(),
    label: document.getElementById("wallet-label").value.trim(),
    network: document.getElementById("wallet-network").value.trim(),
    address: document.getElementById("wallet-address").value.trim(),
    qrPath: qrPath || null,
    active: walletBeingEdited ? walletBeingEdited.active !== false : true,
    sortOrder: walletBeingEdited ? walletBeingEdited.sortOrder : 0,
  };
  if (!payload.symbol || !payload.address) {
    window.alert("A symbol and a deposit address are required.");
    return;
  }
  let saveXhr = new XMLHttpRequest();
  saveXhr.open("POST", "/admin/deposit-wallet", true);
  saveXhr.setRequestHeader("Content-Type", "application/json");
  saveXhr.send(JSON.stringify(payload));
  saveXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("wallet-modal").style.display = "none";
      walletBeingEdited = null;
      getWallets();
      loadCounts();
    }
  };
}

function uploadQr(file, done) {
  let form = new FormData();
  form.append("file", file);
  let uploadXhr = new XMLHttpRequest();
  uploadXhr.open("POST", "/admin/deposit-wallet/qr", true);
  uploadXhr.send(form);
  uploadXhr.onreadystatechange = function () {
    if (this.readyState != 4) return;
    if (this.status == 200) {
      try {
        done(JSON.parse(this.response).qrPath);
      } catch (error) {
        done(null);
      }
      return;
    }
    let message = "Could not upload the QR image";
    try {
      message = JSON.parse(this.response).message || message;
    } catch (error) {}
    window.alert(message);
  };
}

function removeWallet() {
  if (!walletBeingEdited) return;
  if (!window.confirm("Remove this deposit wallet? Members will no longer be shown it.")) return;
  let removeXhr = new XMLHttpRequest();
  removeXhr.open("DELETE", `/admin/deposit-wallet/${walletBeingEdited.walletId}`, true);
  removeXhr.send();
  removeXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("wallet-modal").style.display = "none";
      walletBeingEdited = null;
      getWallets();
      loadCounts();
    }
  };
}

/* Rows sit on one shared grid so every column lines up with the list header.
   Avatars are initials rather than photographs: there is no real portrait
   behind an account, and a stock face reads as though there were one. */
function initialsOf(name) {
  let parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  let first = parts[0].charAt(0);
  let last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

function renderListHead(main, col1, col2, col3, status) {
  return `
  <div class="sc-list-head">
    <span></span>
    <span>${main}</span>
    <span>${col1}</span>
    <span>${col2}</span>
    <span class="sc-num">${col3}</span>
    <span>${status}</span>
    <span></span>
  </div>`;
}

/* Head plus rows in one write, with a real empty state underneath. */
function showListSpinner() {
  document.getElementById("distinct-message-root").innerHTML =
    `<div class="sc-list-loading"><span class="fa fa-spinner fa-spin"></span></div>`;
}

function renderList(headHtml, rowsHtml) {
  let root = document.getElementById("distinct-message-root");
  let foot = document.getElementById("sc-panel-foot");
  if (!rowsHtml) {
    root.innerHTML =
      headHtml +
      `<div class="sc-list-empty">
        <span class="fa fa-inbox" aria-hidden="true"></span>
        <p>Nothing here yet</p>
        <small>Records show up as members register and request withdrawals.</small>
      </div>`;
    if (foot) foot.textContent = "No records";
    return;
  }
  root.innerHTML = headHtml + rowsHtml;
  /* The list scrolls inside a tall panel, so the tally is pinned to its foot
     rather than floating under the last row. */
  if (foot) {
    let count = (rowsHtml.match(/class="sc-row"/g) || []).length;
    foot.textContent = count + (count === 1 ? " record" : " records");
  }
}

function bindUserStatus(address) {
  let user = address.user || {};
  let account = user.account || {};
  return `
  <div class="sc-row">
    <input type="hidden" value="${user.email}" />
    <div class="sc-row-avatar"><span class="sc-row-initials">${initialsOf(user.fullName)}</span></div>
    <div class="sc-row-main">
      <p class="sc-row-title user">${user.fullName}</p>
      <p class="sc-row-sub">${user.email}</p>
    </div>
    <div class="sc-row-cell">${address.country ? address.country.countryName : "-"}</div>
    <div class="sc-row-cell">${formatDate(user.date)}</div>
    <div class="sc-row-amount">$${money(account.accountBalance)}</div>
    <div class="sc-row-status is-success">Active</div>
    <div class="sc-row-go" aria-hidden="true"><span class="fa fa-chevron-right"></span></div>
  </div>`;
}

function bindWithdrawalStatus(item) {
  let tone = "is-pending";
  let label = "Pending";
  if (item.withdrawalStatus == "Successful") {
    tone = "is-success";
    label = "Completed";
  } else if (item.withdrawalStatus == "Declined") {
    tone = "is-declined";
    label = "Declined";
  }
  /* The rail the member picked; older rows predate that column. */
  let method = item.method;
  if (!method && item.crypto) method = item.crypto.crypto;
  return `
  <div class="sc-row">
    <input type="hidden" value="${item.withdrawalId}" />
    <div class="sc-row-avatar"><span class="sc-row-initials">${initialsOf(item.user.fullName)}</span></div>
    <div class="sc-row-main">
      <p class="sc-row-title user-withdrawal">${item.user.fullName}</p>
      <p class="sc-row-sub">${item.user.email}</p>
    </div>
    <div class="sc-row-cell">${method || "-"}</div>
    <div class="sc-row-cell">${formatDate(item.date)}</div>
    <div class="sc-row-amount">$${money(item.amount)}</div>
    <div class="sc-row-status ${tone}">${label}</div>
    <div class="sc-row-go" aria-hidden="true"><span class="fa fa-chevron-right"></span></div>
  </div>`;
}
