// Audio Context Setup
const winSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');

let currentUser = null;
let selectedType = "";
let currentPeriod = 20260907001;
let myBets = [];
let isLocked = false;

// Secret Admin Panel (Click Header Logo)
function toggleAdminPanel() {
  const secretKey = prompt("Admin Key:");
  if(secretKey === "admin123") {
    const addAmt = parseFloat(prompt("Add Balance Amount:"));
    if(addAmt && currentUser) {
      currentUser.balance += addAmt;
      currentUser.hasDeposited = true;
      saveUser();
      showToast(`Added ৳${addAmt} to balance!`);
    }
  }
}

window.onload = function() {
  const savedUser = localStorage.getItem('hgnice_user');
  if(savedUser) {
    currentUser = JSON.parse(savedUser);
    loginUser(false);
  }
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

// User Actions
const regForm = document.getElementById('registerForm');
if(regForm) {
  regForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const phone = document.getElementById('regPhone').value;
    currentUser = { phone, uid: Math.floor(100000 + Math.random() * 900000), balance: 0.00, hasDeposited: false };
    saveAndLogin();
  });
}

const loginForm = document.getElementById('loginForm');
if(loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value;
    currentUser = { phone, uid: Math.floor(100000 + Math.random() * 900000), balance: 0.00, hasDeposited: false };
    saveAndLogin();
  });
}

function saveAndLogin() {
  localStorage.setItem('hgnice_user', JSON.stringify(currentUser));
  loginUser(true);
}

function loginUser(showWelcome = true) {
  document.getElementById('authHeaderBtns').style.display = 'none';
  document.getElementById('bottomNav').style.display = 'flex';
  updateUI();
  showPage('homePage');
  if(showWelcome) showToast("স্বাগতম HGNICE প্ল্যাটফর্মে!");
}

function logout() {
  currentUser = null;
  localStorage.removeItem('hgnice_user');
  document.getElementById('authHeaderBtns').style.display = 'block';
  document.getElementById('bottomNav').style.display = 'none';
  showPage('loginPage');
}

// Betting Logic with Time Lock System
function openBetModal(type) {
  if(isLocked) {
    showToast("সময় শেষ! পরবর্তী রাউন্ডের জন্য অপেক্ষা করুন।", "error");
    return;
  }
  if(!currentUser) { showToast("আগে লগইন করুন!", "error"); return; }
  selectedType = type;
  document.getElementById('modalSelectionTitle').innerText = "সিলেক্টড: " + type;
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
    showToast("রাউন্ড লক হয়ে গেছে!", "error");
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
  
  myBets.push({
    period: currentPeriod,
    selection: selectedType,
    amount: amount,
    status: 'Pending'
  });
  
  updateMyBetsTable();
  showToast(`৳${amount} বেট ধরা হয়েছে (${selectedType})`);
  closeBetModal();
}

function submitDeposit() {
  const amt = document.getElementById('depAmount').value;
  const trx = document.getElementById('depTrx').value;
  if(!amt || !trx) { showToast("তথ্য পূরণ করুন!", "error"); return; }
  
  currentUser.hasDeposited = true;
  currentUser.balance += parseFloat(amt);
  saveUser();
  
  const txBody = document.getElementById('txHistoryBody');
  if(txBody) {
    txBody.innerHTML += `<tr><td>Deposit</td><td>৳${amt}</td><td style="color:#10b981;">Approved</td></tr>`;
  }
  showToast("ডিপোজিট সফল হয়েছে!");
  showPage('profilePage');
}

function submitWithdraw() {
  const amt = parseFloat(document.getElementById('wdAmount').value);
  const acc = document.getElementById('wdAccount').value;
  
  if(!amt || !acc) { showToast("তথ্য দিন!", "error"); return; }
  if(currentUser.balance < amt) { showToast("ব্যালেন্স অপর্যাপ্ত!", "error"); return; }
  
  currentUser.balance -= amt;
  saveUser();
  
  const txBody = document.getElementById('txHistoryBody');
  if(txBody) {
    txBody.innerHTML += `<tr><td>Withdraw</td><td>৳${amt}</td><td style="color:#f59e0b;">Processing</td></tr>`;
  }
  showToast("উইথড্র আবেদন সফল হয়েছে!");
  showPage('profilePage');
}

function claimGiftCode() {
  if(!currentUser) return showToast("আগে লগইন করুন!", "error");
  if (!currentUser.hasDeposited) {
    showToast("⚠️ বোনাস পেতে হলে অন্তত ১টি ডিপোজিট করুন!", "error");
    showPage('depositPage');
    return;
  }
  const code = document.getElementById('giftCodeInput').value.trim();
  if(code.toUpperCase() === "HGNICE100") {
    currentUser.balance += 100;
    saveUser();
    showToast("৳১০০ বোনাস যোগ হয়েছে!");
  } else showToast("অবৈধ কোড!", "error");
}

let checkedInToday = false;
function dailyCheckIn() {
  if(!currentUser) return showToast("আগে লগইন করুন!", "error");
  if (!currentUser.hasDeposited) {
    showToast("⚠️ বোনাস পেতে হলে অন্তত ১টি ডিপোজিট করুন!", "error");
    showPage('depositPage');
    return;
  }
  if(checkedInToday) return showToast("আজকের বোনাস নেওয়া শেষ!", "error");
  currentUser.balance += 10;
  checkedInToday = true;
  saveUser();
  showToast("৳১০ ডেইলি বোনাস যোগ হয়েছে!");
}

function saveUser() {
  localStorage.setItem('hgnice_user', JSON.stringify(currentUser));
  updateUI();
}

function updateUI() {
  if(currentUser) {
    document.getElementById('profUid').innerText = currentUser.uid;
    document.getElementById('profPhone').innerText = currentUser.phone;
    document.getElementById('profBalance').innerText = currentUser.balance.toFixed(2);
    document.getElementById('gameBalance').innerText = currentUser.balance.toFixed(2);
    if(document.getElementById('referCode')) document.getElementById('referCode').innerText = currentUser.uid;
  }
}

function copyReferLink() {
  if(!currentUser) return;
  const referUrl = window.location.origin + "?invite=" + currentUser.uid;
  navigator.clipboard.writeText(referUrl);
  showToast("লিংক কপি করা হয়েছে!");
}

// Win Go Engine
let seconds = 45;
setInterval(() => {
  seconds--;
  
  if(seconds <= 5) {
    isLocked = true;
    const timerEl = document.getElementById('timer');
    if(timerEl) timerEl.style.color = "#f59e0b";
  } else {
    isLocked = false;
    const timerEl = document.getElementById('timer');
    if(timerEl) timerEl.style.color = "#ef4444";
  }

  if(seconds < 0) {
    seconds = 60;
    generateGameResult();
  }
  let secText = seconds < 10 ? '0' + seconds : seconds;
  const timerEl = document.getElementById('timer');
  if(timerEl) timerEl.innerText = "00:" + secText;
}, 1000);

function generateGameResult() {
  const randomNum = Math.floor(Math.random() * 10);
  const isBig = randomNum >= 5 ? "BIG" : "SMALL";
  let color = randomNum % 2 === 0 ? "RED" : "GREEN";
  if(randomNum === 0 || randomNum === 5) color = "VIOLET";
  
  const historyBody = document.getElementById('gameHistoryBody');
  if(historyBody) {
    const row = `<tr>
      <td>${currentPeriod}</td>
      <td>${randomNum}</td>
      <td>${isBig}</td>
      <td><span class="dot ${color.toLowerCase()}-dot"></span></td>
    </tr>`;
    historyBody.innerHTML = row + historyBody.innerHTML;
  }

  myBets.forEach(bet => {
    if(bet.period === currentPeriod && bet.status === 'Pending') {
      if(bet.selection === isBig || bet.selection === color || bet.selection === randomNum.toString()) {
        bet.status = 'WON';
        currentUser.balance += bet.amount * 1.9;
        try { winSound.play(); } catch(e){}
        showToast(`🎉 বিজয়ী! Period ${currentPeriod}-এ জিতলেন!`);
      } else {
        bet.status = 'LOST';
      }
    }
  });

  saveUser();
  updateMyBetsTable();
  currentPeriod++;
  const periodEl = document.getElementById('periodId');
  if(periodEl) periodEl.innerText = currentPeriod;
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
