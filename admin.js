// Admin Authentication & Control Logic
function verifyAdminLogin() {
  const pass = document.getElementById('adminPassInput').value;
  // ডিফল্ট অ্যাডমিন পাসওয়ার্ড "admin123" (প্রয়োজনে পরিবর্তন করে নিতে পারেন)
  if(pass === "admin123") {
    localStorage.setItem('bdgame24_admin_logged', 'true');
    loadAdminDashboard();
  } else {
    alert("ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন (admin123)");
  }
}

window.onload = function() {
  if(localStorage.getItem('bdgame24_admin_logged') === 'true') {
    loadAdminDashboard();
  }
};

function adminLogout() {
  localStorage.removeItem('bdgame24_admin_logged');
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('adminLoginModal').style.display = 'flex';
}

function loadAdminDashboard() {
  document.getElementById('adminLoginModal').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  renderAdminTables();
}

function renderAdminTables() {
  let depHistory = JSON.parse(localStorage.getItem('bdgame24_depRec')) || [];
  let wdHistory = JSON.parse(localStorage.getItem('bdgame24_wdRec')) || [];

  document.getElementById('totalDepReq').innerText = depHistory.length;
  document.getElementById('totalWdReq').innerText = wdHistory.length;

  // Deposit Table Render
  const adminDepBody = document.getElementById('adminDepBody');
  if(depHistory.length > 0) {
    adminDepBody.innerHTML = depHistory.map((d, index) => `
      <tr>
        <td>${d.method}</td>
        <td>৳${d.amount}</td>
        <td>${d.trx}</td>
        <td style="color:${d.status === 'Success' ? '#10b981' : d.status === 'Cancelled' ? '#ef4444' : '#f59e0b'}">${d.status}</td>
        <td>
          ${d.status === 'Pending' ? `
            <button class="action-btn btn-approve" onclick="updateDepStatus(${index}, 'Success')">অ্যাপ্রুভ</button>
            <button class="action-btn btn-cancel" onclick="updateDepStatus(${index}, 'Cancelled')">ক্যান্সেল</button>
          ` : 'সম্পন্ন'}
        </td>
      </tr>
    `).join('');
  } else {
    adminDepBody.innerHTML = `<tr><td colspan="5" style="color:#94a3b8; text-align:center;">কোনো ডিপোজিট রিকুয়েস্ট নেই</td></tr>`;
  }

  // Withdraw Table Render
  const adminWdBody = document.getElementById('adminWdBody');
  if(wdHistory.length > 0) {
    adminWdBody.innerHTML = wdHistory.map((w, index) => `
      <tr>
        <td>${w.method}</td>
        <td>${w.account}</td>
        <td>৳${w.amount}</td>
        <td style="color:${w.status === 'Success' ? '#10b981' : w.status === 'Cancelled' ? '#ef4444' : '#f59e0b'}">${w.status}</td>
        <td>
          ${w.status === 'Pending' ? `
            <button class="action-btn btn-approve" onclick="updateWdStatus(${index}, 'Success')">পেমেন্ট দিন</button>
            <button class="action-btn btn-cancel" onclick="updateWdStatus(${index}, 'Cancelled')">বাতিল করুন</button>
          ` : 'সম্পন্ন'}
        </td>
      </tr>
    `).join('');
  } else {
    adminWdBody.innerHTML = `<tr><td colspan="5" style="color:#94a3b8; text-align:center;">কোনো উইথড্র রিকুয়েস্ট নেই</td></tr>`;
  }
}

function updateDepStatus(index, status) {
  let depHistory = JSON.parse(localStorage.getItem('bdgame24_depRec')) || [];
  depHistory[index].status = status;
  localStorage.setItem('bdgame24_depRec', JSON.stringify(depHistory));
  
  // যদি অ্যাপ্রুভ হয়, ইউজারের ব্যালেন্সে টাকা যোগ করে দেওয়া যাবে
  if(status === 'Success') {
    let user = JSON.parse(localStorage.getItem('bdgame24_user'));
    if(user) {
      user.balance += parseFloat(depHistory[index].amount);
      localStorage.setItem('bdgame24_user', JSON.stringify(user));
    }
  }
  renderAdminTables();
  alert("ডিপোজিট স্ট্যাটাস আপডেট করা হয়েছে!");
}

function updateWdStatus(index, status) {
  let wdHistory = JSON.parse(localStorage.getItem('bdgame24_wdRec')) || [];
  wdHistory[index].status = status;
  localStorage.setItem('bdgame24_wdRec', JSON.stringify(wdHistory));
  
  // যদি উইথড্র ক্যান্সেল করা হয়, টাকা আবার ইউজারের অ্যাকাউন্টে ফিরিয়ে দেওয়া
  if(status === 'Cancelled') {
    let user = JSON.parse(localStorage.getItem('bdgame24_user'));
    if(user) {
      user.balance += parseFloat(wdHistory[index].amount);
      localStorage.setItem('bdgame24_user', JSON.stringify(user));
    }
  }
  renderAdminTables();
  alert("উইথড্র স্ট্যাটাস আপডেট করা হয়েছে!");
    }
