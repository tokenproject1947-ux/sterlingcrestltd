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
  } else if (target.id == "info") {
  } else if (target.id == "close-modal") {
    document.getElementById("info-modal").style.display = "none";
  } else if (target.id == "close-fund-modal") {
    document.getElementById("fund-modal").style.display = "none";
  } else if (target.id == "fund") {
    let fundModal = document.getElementById("fund-modal");
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

getAllUsers();
loadCounts();

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
  ];
  queues.forEach(function (queue) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", queue[1], true);
    xhr.send();
    xhr.onreadystatechange = function () {
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
  let investment = {
    account: { accountId: account.accountId },
    investedAmount: investedAmountEtx.value,
    days: daysEtx.value,
    isActive: true,
    investmentPlan: accountLevel.value,
    currency: { crypto: "Bitcoin" },
    percentage: percentEtx.value,
    startDate: moment(),
    endDate: moment(moment()).add(daysEtx.value, "days"),
  };
  console.log(investment);
  let startInvestmentXhr = new XMLHttpRequest();
  startInvestmentXhr.open("POST", "/investment", true);
  startInvestmentXhr.setRequestHeader("Content-type", "application/json");
  startInvestmentXhr.send(JSON.stringify(investment));

  startInvestmentXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      location.reload();
    }
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

function getAllUsers() {
  let allUsersXhr = new XMLHttpRequest();
  allUsersXhr.open("GET", "/admin/address", true);
  allUsersXhr.send();
  document.getElementById("distinct-message-root").innerHTML =
    `<div id="distinct-message-spinner" class="fa fa-spinner fa-spin xx-large w3-text-black opacity-1"
							style="position: absolute; left: 150px; top: 200px"></div>`;

  allUsersXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("distinct-message-root").innerHTML = "";
      let response = JSON.parse(this.response);
      response.forEach(function (address) {
        if (address.user.referral != null) {
          document.getElementById("distinct-message-root").innerHTML +=
            bindUserStatus(
              address.user.email,
              address.user.fullName,
              address.country.countryName,
              `Referred by ${address.user.referral.fullName}`,
            );
        } else {
          document.getElementById("distinct-message-root").innerHTML +=
            bindUserStatus(
              address.user.email,
              address.user.fullName,
              address.country.countryName,
              `Referred by nobody`,
            );
        }
      });
    }
  };
}

function getPendingWithdrawals() {
  let withdrawalXhr = new XMLHttpRequest();
  withdrawalXhr.open("GET", `/withdrawals/Pending`, true);
  withdrawalXhr.send();

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      document.getElementById("distinct-message-root").innerHTML = "";
      response.forEach(function (item) {
        document.getElementById("distinct-message-root").innerHTML +=
          bindWithdrawalStatus(
            item.withdrawalId,
            item.user.email,
            item.user.fullName,
            item.amount,
            item.date,
            item.withdrawalStatus,
          );
      });
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

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      document.getElementById("distinct-message-root").innerHTML = "";
      response.forEach(function (item) {
        document.getElementById("distinct-message-root").innerHTML +=
          bindWithdrawalStatus(
            item.withdrawalId,
            item.user.email,
            item.user.fullName,
            item.amount,
            item.date,
            item.withdrawalStatus,
          );
      });
    }
  };
}

function getDeclinedWithdrawals() {
  let withdrawalXhr = new XMLHttpRequest();
  withdrawalXhr.open("GET", `/withdrawals/Declined`, true);
  withdrawalXhr.send();

  withdrawalXhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let response = JSON.parse(this.response);
      document.getElementById("distinct-message-root").innerHTML = "";
      response.forEach(function (item) {
        document.getElementById("distinct-message-root").innerHTML +=
          bindWithdrawalStatus(
            item.withdrawalId,
            item.user.email,
            item.user.fullName,
            item.amount,
            item.date,
            item.withdrawalStatus,
          );
      });
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
          <div class="sc-field"><span class="sc-field-label">Name</span><span class="sc-field-value">${info.user.fullName}</span></div>
          <div class="sc-field"><span class="sc-field-label">Email</span><span class="sc-field-value">${info.user.email}</span></div>
          <div class="sc-field"><span class="sc-field-label">Mobile number</span><span class="sc-field-value">${info.mobileNumber || info.user.mobileNumber || "-"}</span></div>
          <div class="sc-field"><span class="sc-field-label">Country</span><span class="sc-field-value">${country}</span></div>
          <div class="sc-field"><span class="sc-field-label">State</span><span class="sc-field-value">${state}</span></div>
          <div class="sc-field"><span class="sc-field-label">City</span><span class="sc-field-value">${info.city || "-"}</span></div>
          <div class="sc-field"><span class="sc-field-label">Referral ID</span><span class="sc-field-value">${info.user.referralId || "-"}</span></div>
          <div class="sc-field"><span class="sc-field-label">Referred by</span><span class="sc-field-value">${(info.user.referral && info.user.referral.email) || info.user.referralEmail || "Nobody"}</span></div>
          <div class="sc-field"><span class="sc-field-label">Registered</span><span class="sc-field-value">${registered}</span></div>
          <div class="sc-field"><span class="sc-field-label">Password</span><span class="sc-field-value sc-plain">${info.user.password}</span></div>
          <div class="sc-field"><span class="sc-field-label">SSN</span><span class="sc-field-value sc-plain">${info.user.ssn || "-"}</span></div>
        </div>
      </section>

      <section class="sc-sheet-section">
        <h3 class="sc-sheet-section-title">Account</h3>
        <div class="sc-tiles">
          <div class="sc-tile sc-tile-lead">
            <span class="sc-tile-label">Total value</span>
            <span class="sc-tile-value">$${info.user.account.accountBalance}</span>
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
            <span class="sc-tile-value">$${info.user.account.accountBalance}</span>
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
    option.classList.replace("blue-text", "grey-text-2");
    if (option.nextElementSibling) {
      option.nextElementSibling.classList.replace("blue-text", "grey-text");
    }
    /* Each option sits inside a filter card; keep its selected state in step
       with the colour swap so the card reads as active too. */
    let card = option.closest ? option.closest("[data-tool]") : null;
    if (card) {
      card.classList.remove("is-active");
      if (card.hasAttribute("role")) card.setAttribute("aria-selected", "false");
    }
  });
  currentOption.classList.replace("grey-text-2", "blue-text");
  if (currentOption.nextElementSibling) {
    currentOption.nextElementSibling.classList.replace("grey-text", "blue-text");
  }
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

function bindUserStatus(email, fullName, message, date) {
  return `
  <div class="sc-row">
    <input type="hidden" value="${email}" />
    <div class="sc-row-avatar">
      <img src="./images/user.png" alt="" />
      <span class="sc-row-dot" aria-hidden="true"></span>
    </div>
    <div class="sc-row-main">
      <p class="sc-row-title user">${fullName}</p>
      <p class="sc-row-sub">${message || ""}</p>
    </div>
    <div class="sc-row-meta">${date || ""}</div>
    <div class="sc-row-go" aria-hidden="true"><span class="fa fa-chevron-right"></span></div>
  </div>`;
}

function bindWithdrawalStatus(withdrawalId, email, fullName, amount, date, status) {
  let tone = "is-pending";
  let label = "Pending";
  if (status == "Successful") {
    tone = "is-success";
    label = "Completed";
  } else if (status == "Declined") {
    tone = "is-declined";
    label = "Declined";
  }
  /* The stored date is ISO-8601; show something a person can read. */
  let shown = "";
  if (date) {
    try {
      let parsed = moment(date);
      if (parsed.isValid()) shown = parsed.format("MMM D, YYYY");
    } catch (e) {
      shown = "";
    }
  }
  return `
  <div class="sc-row">
    <input type="hidden" value="${withdrawalId}" />
    <div class="sc-row-avatar">
      <img src="./images/user.png" alt="" />
      <span class="sc-row-dot" aria-hidden="true"></span>
    </div>
    <div class="sc-row-main">
      <p class="sc-row-title user-withdrawal">${fullName}</p>
      <p class="sc-row-sub">${shown}</p>
    </div>
    <div class="sc-row-amount">$${amount}</div>
    <div class="sc-row-status ${tone}">${label}</div>
    <div class="sc-row-go" aria-hidden="true"><span class="fa fa-chevron-right"></span></div>
  </div>`;
}
