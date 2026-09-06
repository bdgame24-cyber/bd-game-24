const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(__dirname));

// Admin Passwords & Credentials
const ADMIN_CREDENTIALS = {
    username: "bdgame24",
    password: "101024"
};

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
    status: "OPEN",
    manualWinner: null,
    bets: []
};

let deposits = [];

// Admin Login Route
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        return res.json({ success: true, message: "Login Successful!" });
    }
    res.status(401).json({ error: "Invalid Username or Password!" });
});

app.get('/api/payment-numbers', (req, res) => {
    res.json(paymentGateways);
});

app.post('/api/bet', (req, res) => {
    const { userId, color, amount } = req.body;
    if (currentPeriod.status !== "OPEN") {
        return res.status(400).json({ error: "Round Locked!" });
    }
    const user = users.find(u => u.id === parseInt(userId));
    if (!user || user.balance < amount) {
        return res.status(400).json({ error: "Insufficient Balance!" });
    }

    user.balance -= amount;
    currentPeriod.bets.push({ userId: user.id, userName: user.name, color, amount: parseFloat(amount) });
    
    io.emit('bet_update', { bets: currentPeriod.bets });
    res.json({ success: true, balance: user.balance });
});

app.post('/api/deposit', (req, res) => {
    const { userId, gateway, trxId, amount } = req.body;
    deposits.push({ id: Date.now(), userId, gateway, trxId, amount, status: 'PENDING' });
    res.json({ success: true, message: "Deposit Request Received!" });
});

app.post('/api/admin/update-gateway', (req, res) => {
    const { gateway, newNumber } = req.body;
    if (paymentGateways[gateway] !== undefined) {
        paymentGateways[gateway] = newNumber;
        io.emit('gateway_update', paymentGateways);
        return res.json({ success: true, message: `${gateway.toUpperCase()} Number Updated!` });
    }
    res.status(400).json({ error: "Invalid Gateway!" });
});

app.post('/api/admin/set-result', (req, res) => {
    const { color } = req.body;
    currentPeriod.manualWinner = color;
    res.json({ success: true, message: `Force Winner Set To: ${color}` });
});

setInterval(() => {
    if (currentPeriod.timer > 0) {
        currentPeriod.timer--;
        if (currentPeriod.timer === 10) {
            currentPeriod.status = "LOCKED";
        }
    } else {
        let winningColor = currentPeriod.manualWinner;

        if (!winningColor) {
            let totals = { RED: 0, GREEN: 0, VIOLET: 0 };
            currentPeriod.bets.forEach(b => { totals[b.color] = (totals[b.color] || 0) + b.amount; });
            winningColor = Object.keys(totals).reduce((a, b) => totals[a] < totals[b] ? a : b);
        }

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
        periodId: currentPeriod.periodId
    });
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
