let currentUser = null;
let selectedType = "";
let currentPeriod = 20260907001;
let myBets = [];
let gameHistory = [];
let isLocked = false;

window.onload = function() {
  const savedUser = localStorage.getItem('bdgame24_user');
  if(savedUser) {
    currentUser = JSON.parse(savedUser);
    loginUser(false);
  }

  const savedHistory = localStorage.getItem('bdgame24_history');
  if(savedHistory) {
    gameHistory = JSON.parse(savedHistory);
  }

  const savedBets = localStorage.getItem('bdgame24_mybets');
  if(savedBets) {
    myBets = JSON.parse(savedBets);
  }

  const savedPeriod = localStorage.getItem('bdgame24_period');
  if(savedPeriod) {
    currentPeriod = parseInt(savedPeriod);
  }

  updateGameHistoryTable();
  updateMyBetsTable();
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

// "কাজ চলছে" নোটিফিকেশন ফাংশন
function showWorkInProgress() {
  showToast("কাজ চলছে! শীঘ্রই আসছে...", "error");
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(pageId);
  if(targetPage) targetPage.classList.add('active');
}

function switchGameTab(tabId, element) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  document.getElementById(tabId).classList.add('active');
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
      referredBy: inviteCode || "None"
    };
    saveAndLogin();
  });
}

const loginForm = document.getElementById('loginForm');
if(loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value;
    currentUser = { phone, uid: Math.floor(100000 + Math.random() * 900000), balance: 0.00 };
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

// Referral Modal Functions
function openReferModal() {
  if(!currentUser) { showToast("আগে লগইন করুন!", "error"); return; }
  const referUrl = window.location.origin + "?invite=" + currentUser.uid;
  const referLinkEl = document.getElementById('referLinkText');
  if(referLinkEl) referLinkEl.innerText = referUrl;
  document.getElementById('referModal').style.display = "flex";
}

function closeReferModal() {
  document.getElementById('referModal').style.display = "none";
}

function copyReferLink() {
  const referUrl = window.location.origin + "?invite=" + (currentUser ? currentUser.uid : "");
  navigator.clipboard.writeText(referUrl).then(() => {
    showToast("রেফার লিংক সফলভাবে কপি হয়েছে!");
    closeReferModal();
  }).catch(() => {
    showToast("কপি করতে সমস্যা হয়েছে!", "error");
  });
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
  const amt = document.getElementById('depAmount').value;
  const trx = document.getElementById('depTrx').value;
  if(!amt || !trx) { showToast("সব তথ্য দিন!", "error"); return; }
  
  currentUser.balance += parseFloat(amt);
  saveUser();
  showToast("ডিপোজিট সফল হয়েছে!");
  showPage('profilePage');
}

function submitWithdraw() {
  const amt = parseFloat(document.getElementById('wdAmount').value);
  const acc = document.getElementById('wdAccount').value;
  if(!amt || !acc) { showToast("তথ্য দিন!", "error"); return; }
  if(currentUser.balance < amt) { showToast("ব্যালেন্স কম!", "error"); return; }
  
  currentUser.balance -= amt;
  saveUser();
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

// 30 Seconds Timer Logic (Last 5 Seconds Locked)
let seconds = 30;
setInterval(() => {
  seconds--;

  if(seconds <= 5) {
    isLocked = true;
  } else {
    isLocked = false;
  }

  if(seconds < 0) {
    seconds = 30;
    generateGameResult();
  }

  let secText = seconds < 10 ? '0' + seconds : seconds;
  const timerEl = document.getElementById('timer');
  if(timerEl) {
    timerEl.innerText = "00:" + secText;
    if(isLocked) {
      timerEl.style.color = "#f59e0b";
    } else {
      timerEl.style.color = "#ef4444";
    }
  }
}, 1000);

function generateGameResult() {
  const randomNum = Math.floor(Math.random() * 10);
  const isBig = randomNum >= 5 ? "BIG" : "SMALL";
  let color = randomNum % 2 === 0 ? "RED" : "GREEN";
  if(randomNum === 0 || randomNum === 5) color = "VIOLET";
  
  const newResult = {
    period: currentPeriod,
    number: randomNum,
    size: isBig,
    color: color
  };

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
