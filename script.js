let currentUser = null;
let selectedType = "";
let currentPeriod = 20260907001;
let myBets = [];
let gameHistory = [];
let depositHistory = [];
let withdrawHistory = [];
let isLocked = false;

window.onload = function() {
  const savedUser = localStorage.getItem('bdgame24_user');
  if(savedUser) {
    currentUser = JSON.parse(savedUser);
    loginUser(false);
  }

  if(localStorage.getItem('bdgame24_history')) gameHistory = JSON.parse(localStorage.getItem('bdgame24_history'));
  if(localStorage.getItem('bdgame24_mybets')) myBets = JSON.parse(localStorage.getItem('bdgame24_mybets'));
  if(localStorage.getItem('bdgame24_period')) currentPeriod = parseInt(localStorage.getItem('bdgame24_period'));
  if(localStorage.getItem('bdgame24_depRec')) depositHistory = JSON.parse(localStorage.getItem('bdgame24_depRec'));
  if(localStorage.getItem('bdgame24_wdRec')) withdrawHistory = JSON.parse(localStorage.getItem('bdgame24_wdRec'));

  updateGameHistoryTable();
  updateMyBetsTable();
  updateRecordTables();
  const periodEl = document.getElementById('periodId');
  if(periodEl) periodEl.innerText = currentPeriod;
};

function showToast(msg, type = "success") {
  const box = document.getElementById('toastBox');
  if(!box) return;
  const toast = document.createElement('div');
  toast.className = `toast-msg ${type === 'error' ? 'error' : ''}`;
  toast.innerText = msg;
  box.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showWorkInProgress() {
  showToast("কাজ চলছে! শীঘ্রই আসছে...", "error");
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(pageId);
  if(targetPage) targetPage.classList.add('active');

  if(pageId === 'referralPage' && currentUser) {
    updateReferralDashboard();
  }
}

function switchGameTab(tabId, element) {
  document.querySelectorAll('#gamePage .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#gamePage .tab-content').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function switchRecordTab(tabId, element) {
  document.querySelectorAll('#recordsPage .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#recordsPage .tab-content').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// Universal Robust Copy Function (Works everywhere including local files)
function copyTextToClipboard(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showToast(successMsg);
    } else {
      showToast("কপি করা যায়নি!", "error");
    }
  } catch (err) {
    showToast("কপি করতে সমস্যা হয়েছে!", "error");
  }
  document.body.removeChild(textArea);
}

function copyMerchantNumber() {
  const num = document.getElementById('merchantNumberText').innerText;
  copyTextToClipboard(num, "মার্চেন্ট নম্বর সফলভাবে কপি হয়েছে!");
}

function copyReferLink() {
  const referUrl = document.getElementById('referLinkText').innerText;
  if(!referUrl || referUrl === '-') {
    showToast("লিংক পাওয়া যায়নি!", "error");
    return;
  }
  copyTextToClipboard(referUrl, "রেফার লিংক সফলভাবে কপি হয়েছে!");
}

// Authentication
const regForm = document.getElementById('registerForm');
if(regForm) {
  regForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const phone = document.getElementById('regPhone').value;
    const inviteCode = document.getElementById('regInvite') ? document.getElementById('regInvite').value : "";
    
    currentUser = { 
      phone, 
      uid: Math.floor(100000 + Math.random() * 900000), 
      balance: 0.00,
      referredBy: inviteCode || "None",
      referCount: 0,
      referBonusAmt: 0.00,
      referList: []
    };
    saveAndLogin();
  });
}

const loginForm = document.getElementById('loginForm');
if(loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value;
    currentUser = { 
      phone, 
      uid: Math.floor(100000 + Math.random() * 900000), 
      balance: 0.00, 
      referCount: 1, 
      referBonusAmt: 50.00,
      referList: [{ phone: "018********", date: "07/09/2026", bonus: 50 }]
    };
    saveAndLogin();
  });
}

function saveAndLogin() {
  localStorage.setItem('bdgame24_user', JSON.stringify(currentUser));
  loginUser(true);
}

function loginUser(showWelcome = true) {
  if(document.getElementById('authHeaderBtns')) document.getElementById('authHeaderBtns').style.display = 'none';
  if(document.getElementById('bottomNav')) document.getElementById('bottomNav').style.display = 'flex';
  updateUI();
  showPage('homePage');
  if(showWelcome) showToast("BD GAME 24-এ স্বাগতম!");
}

function logout() {
  currentUser = null;
  localStorage.removeItem('bdgame24_user');
  if(document.getElementById('authHeaderBtns')) document.getElementById('authHeaderBtns').style.display = 'block';
  if(document.getElementById('bottomNav')) document.getElementById('bottomNav').style.display = 'none';
  showPage('loginPage');
}

// Password Change
function changePassword() {
  const oldP = document.getElementById('oldPass').value;
  const newP = document.getElementById('newPass').value;
  if(!oldP || !newP) {
    showToast("সব ফিল্ড পূরণ করুন!", "error");
    return;
  }
  showToast("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!");
  showPage('profilePage');
}

// Referral Dashboard Logic
function updateReferralDashboard() {
  if(!currentUser) return;
  const referUrl = window.location.origin + window.location.pathname + "?invite=" + currentUser.uid;
  document.getElementById('referLinkText').innerText = referUrl;
  document.getElementById('totalRefers').innerText = (currentUser.referCount || 0) + " জন";
  document.getElementById('referBonus').innerText = (currentUser.referBonusAmt || 0).toFixed(2);

  const referListBody = document.getElementById('referListBody');
  if(currentUser.referList && currentUser.referList.length > 0) {
    referListBody.innerHTML = currentUser.referList.map(r => `
      <tr><td>${r.phone}</td><td>${r.date}</td><td style="color:#10b981;">৳${r.bonus}</td></tr>
    `).join('');
  } else {
    referListBody.innerHTML = `<tr><td colspan="3" style="color:#94a3b8;">এখনো কেউ আপনার লিংকে রেজিস্টার করেনি</td></tr>`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteParam = urlParams.get('invite');
  if(inviteParam) {
    const inviteInput = document.getElementById('regInvite');
    if(inviteInput) inviteInput.value = inviteParam;
  }
});

// Betting System
function openBetModal(type) {
  if(isLocked) {
    showToast("সময় শেষ! বেটিং লক করা হয়েছে।", "error");
    return;
  }
  if(!currentUser) { showToast("আগে লগইন করুন!", "error"); return; }
  selectedType = type;
  document.getElementById('modalSelectionTitle').innerText = "সিলেকশন: " + type;
  document.getElementById('betModal').style.display = "flex";
}

function closeBetModal() {
  document.getElementById('betModal').style.display = "none";
}

function setBetAmount(amt) {
  document.getElementById('customAmount').value = amt;
}

function confirmBet() {
  if(isLocked) { 
    showToast("রাউন্ড লক হয়ে গেছে, বেট নেওয়া যাবে না!", "error"); 
    closeBetModal(); 
    return; 
  }
  const amount = parseFloat(document.getElementById('customAmount').value);
  if(currentUser.balance < amount) {
    showToast("পর্যাপ্ত ব্যালেন্স নেই!", "error");
    closeBetModal();
    showPage('depositPage');
    return;
  }
  
  currentUser.balance -= amount;
  saveUser();
  
  myBets.unshift({ period: currentPeriod, selection: selectedType, amount: amount, status: 'Pending' });
  localStorage.setItem('bdgame24_mybets', JSON.stringify(myBets));
  updateMyBetsTable();
  showToast(`৳${amount} বেট কনফার্ম হয়েছে`);
  closeBetModal();
}

function submitDeposit() {
  const method = document.getElementById('depMethod').value;
  const amt = document.getElementById('depAmount').value;
  const trx = document.getElementById('depTrx').value;
  if(!amt || !trx) { showToast("সব তথ্য দিন!", "error"); return; }
  
  currentUser.balance += parseFloat(amt);
  saveUser();

  depositHistory.unshift({ method, amount: amt, trx, status: 'Success' });
  localStorage.setItem('bdgame24_depRec', JSON.stringify(depositHistory));
  updateRecordTables();

  showToast("ডিপোজিট সফল হয়েছে!");
  showPage('profilePage');
}

function submitWithdraw() {
  const method = document.getElementById('wdMethod').value;
  const amt = parseFloat(document.getElementById('wdAmount').value);
  const acc = document.getElementById('wdAccount').value;
  if(!amt || !acc) { showToast("তথ্য দিন!", "error"); return; }
  if(currentUser.balance < amt) { showToast("ব্যালেন্স কম!", "error"); return; }
  
  currentUser.balance -= amt;
  saveUser();

  withdrawHistory.unshift({ method, account: acc, amount: amt, status: 'Pending' });
  localStorage.setItem('bdgame24_wdRec', JSON.stringify(withdrawHistory));
  updateRecordTables();

  showToast("উইথড্র আবেদন সফল হয়েছে!");
  showPage('profilePage');
}

function saveUser() {
  localStorage.setItem('bdgame24_user', JSON.stringify(currentUser));
  updateUI();
}

function updateUI() {
  if(currentUser) {
    if(document.getElementById('profUid')) document.getElementById('profUid').innerText = currentUser.uid;
    if(document.getElementById('profPhone')) document.getElementById('profPhone').innerText = currentUser.phone;
    if(document.getElementById('profBalance')) document.getElementById('profBalance').innerText = currentUser.balance.toFixed(2);
    if(document.getElementById('gameBalance')) document.getElementById('gameBalance').innerText = currentUser.balance.toFixed(2);
  }
}

// Timer Logic
let seconds = 30;
setInterval(() => {
  seconds--;
  isLocked = seconds <= 5;

  if(seconds < 0) {
    seconds = 30;
    generateGameResult();
  }

  let secText = seconds < 10 ? '0' + seconds : seconds;
  const timerEl = document.getElementById('timer');
  if(timerEl) {
    timerEl.innerText = "00:" + secText;
    timerEl.style.color = isLocked ? "#f59e0b" : "#ef4444";
  }
}, 1000);

function generateGameResult() {
  const randomNum = Math.floor(Math.random() * 10);
  const isBig = randomNum >= 5 ? "BIG" : "SMALL";
  let color = randomNum % 2 === 0 ? "RED" : "GREEN";
  if(randomNum === 0 || randomNum === 5) color = "VIOLET";
  
  const newResult = { period: currentPeriod, number: randomNum, size: isBig, color: color };
  gameHistory.unshift(newResult);
  if(gameHistory.length > 20) gameHistory.pop();
  localStorage.setItem('bdgame24_history', JSON.stringify(gameHistory));
  updateGameHistoryTable();

  myBets.forEach(bet => {
    if(bet.period === currentPeriod && bet.status === 'Pending') {
      if(bet.selection === isBig || bet.selection === color || bet.selection === bet.number || bet.selection === randomNum.toString()) {
        bet.status = 'WON';
        currentUser.balance += bet.amount * 1.9;
        showToast(`🎉 অভিনন্দন! Period ${currentPeriod}-এ জিতেছেন!`);
      } else {
        bet.status = 'LOST';
      }
    }
  });

  localStorage.setItem('bdgame24_mybets', JSON.stringify(myBets));
  saveUser();
  updateMyBetsTable();

  currentPeriod++;
  localStorage.setItem('bdgame24_period', currentPeriod);
  const periodEl = document.getElementById('periodId');
  if(periodEl) periodEl.innerText = currentPeriod;
}

function updateGameHistoryTable() {
  const historyBody = document.getElementById('gameHistoryBody');
  if(!historyBody) return;
  historyBody.innerHTML = gameHistory.map(h => `
    <tr>
      <td>${h.period}</td>
      <td>${h.number}</td>
      <td>${h.size}</td>
      <td><span class="dot ${h.color.toLowerCase()}-dot"></span></td>
    </tr>
  `).join('');
}

function updateMyBetsTable() {
  const myBetsBody = document.getElementById('myBetsBody');
  if(!myBetsBody) return;
  myBetsBody.innerHTML = myBets.map(b => `
    <tr>
      <td>${b.period}</td>
      <td>${b.selection}</td>
      <td>৳${b.amount}</td>
      <td style="color:${b.status === 'WON' ? '#10b981' : b.status === 'LOST' ? '#ef4444' : '#f59e0b'}">${b.status}</td>
    </tr>
  `).join('');
}

function updateRecordTables() {
  const depBody = document.getElementById('depHistoryBody');
  if(depBody) {
    depBody.innerHTML = depositHistory.map(d => `
      <tr><td>${d.method}</td><td>৳${d.amount}</td><td>${d.trx}</td><td style="color:#10b981;">${d.status}</td></tr>
    `).join('');
  }

  const wdBody = document.getElementById('wdHistoryBody');
  if(wdBody) {
    wdBody.innerHTML = withdrawHistory.map(w => `
      <tr><td>${w.method}</td><td>${w.account}</td><td>৳${w.amount}</td><td style="color:#f59e0b;">${w.status}</td></tr>
    `).join('');
  }
}
