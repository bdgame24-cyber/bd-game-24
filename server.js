const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Memory State
let users = [
    { id: 101, name: "Admin", phone: "01700000000", balance: 100000, role: "admin" },
    { id: 102, name: "User1", phone: "01800000001", balance: 1000, role: "user" }
];

let paymentGateways = {
    bkash: "01700000000",
    nagad: "01800000000",
    rocket: "01900000000"
};

let currentPeriod = {
    periodId: "BD20260907001",
    timer: 60,
    status: "OPEN", // OPEN, LOCKED, CLOSED
    manualWinner: null,
    bets: [] // { userId, userName, color, amount }
};

let deposits = [];
let withdrawals = [];

// ----------------- USER APIS -----------------

// Fetch Payment Numbers
app.get('/api/payment-numbers', (req, res) => {
    res.json(paymentGateways);
});

// User Bet API
app.post('/api/bet', (req, res) => {
    const { userId, color, amount } = req.body;
    if (currentPeriod.status !== "OPEN") {
        return res.status(400).json({ error: "এই রাউন্ডে বেট নেওয়ার সময় শেষ!" });
    }
    const user = users.find(u => u.id === parseInt(userId));
    if (!user || user.balance < amount) {
        return res.status(400).json({ error: "পর্যাপ্ত ব্যালেন্স নেই!" });
    }

    user.balance -= amount;
    currentPeriod.bets.push({ userId: user.id, userName: user.name, color, amount: parseFloat(amount) });
    
    io.emit('bet_update', { bets: currentPeriod.bets });
    res.json({ success: true, balance: user.balance });
});

// Deposit Request API
app.post('/api/deposit', (req, res) => {
    const { userId, gateway, trxId, amount } = req.body;
    const depositObj = { id: Date.now(), userId, gateway, trxId, amount, status: 'PENDING', date: new Date().toLocaleString() };
    deposits.push(depositObj);
    res.json({ success: true, message: "ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে!" });
});

// ----------------- ADMIN APIS -----------------

// Update Payment Gateways
app.post('/api/admin/update-gateway', (req, res) => {
    const { gateway, newNumber } = req.body;
    if (paymentGateways[gateway] !== undefined) {
        paymentGateways[gateway] = newNumber;
        io.emit('gateway_update', paymentGateways);
        return res.json({ success: true, message: `${gateway.toUpperCase()} নম্বর সফলভাবে পরিবর্তন হয়েছে!` });
    }
    res.status(400).json({ error: "ইনভ্যালিড গেটওয়ে!" });
});

// Set Manual Winner Result
app.post('/api/admin/set-result', (req, res) => {
    const { color } = req.body;
    currentPeriod.manualWinner = color;
    res.json({ success: true, message: `Force Winner Set To: ${color}` });
});

// Approve/Reject Deposit
app.post('/api/admin/handle-deposit', (req, res) => {
    const { depositId, action } = req.body;
    const dep = deposits.find(d => d.id === depositId);
    if (!dep) return res.status(404).json({ error: "নট ফাউন্ড!" });

    dep.status = action; // APPROVED or REJECTED
    if (action === 'APPROVED') {
        const user = users.find(u => u.id === parseInt(dep.userId));
        if (user) user.balance += parseFloat(dep.amount);
    }
    res.json({ success: true, message: `Deposit ${action}` });
});

// ----------------- REALTIME GAME ENGINE -----------------
setInterval(() => {
    if (currentPeriod.timer > 0) {
        currentPeriod.timer--;
        if (currentPeriod.timer === 10) {
            currentPeriod.status = "LOCKED";
        }
    } else {
        // Winner Calculation Logic
        let winningColor = currentPeriod.manualWinner;

        // Auto Profit Engine (Lowest bet color wins)
        if (!winningColor) {
            let totals = { RED: 0, GREEN: 0, VIOLET: 0 };
            currentPeriod.bets.forEach(b => { totals[b.color] = (totals[b.color] || 0) + b.amount; });
            winningColor = Object.keys(totals).reduce((a, b) => totals[a] < totals[b] ? a : b);
        }

        // Payout Winners
        currentPeriod.bets.forEach(b => {
            if (b.color === winningColor) {
                const u = users.find(user => user.id === b.userId);
                if (u) {
                    const mult = winningColor === 'VIOLET' ? 4.5 : 2.0;
                    u.balance += (b.amount * mult);
                }
            }
        });

        io.emit('round_result', {
            periodId: currentPeriod.periodId,
            winningColor,
            bets: currentPeriod.bets
        });

        // Reset Engine
        currentPeriod = {
            periodId: "BD" + (parseInt(currentPeriod.periodId.replace("BD", "")) + 1),
            timer: 60,
            status: "OPEN",
            manualWinner: null,
            bets: []
        };
    }

    io.emit('timer_tick', {
        timer: currentPeriod.timer,
        status: currentPeriod.status,
        periodId: currentPeriod.periodId,
        bets: currentPeriod.bets,
        manualWinner: currentPeriod.manualWinner
    });
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`BD GAME 24 operational on port ${PORT}`));
