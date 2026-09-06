const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

// Temporary Data Store
let walletStore = [];

// API to save user withdrawal wallet details
app.post('/api/wallet/save', (req, res) => {
  const { userId, type, name, account } = req.body;
  if (!type || !name || !account) {
    return res.status(400).json({ success: false, message: 'Fill out all details!' });
  }
  
  // Update or add wallet record
  const index = walletStore.findIndex(item => item.userId === userId);
  if (index !== -1) {
    walletStore[index] = { userId, type, name, account };
  } else {
    walletStore.push({ userId, type, name, account });
  }

  res.json({ success: true, message: 'E-Wallet method updated successfully!' });
});

// Admin API to view stored withdrawal info
app.get('/api/admin/wallets', (req, res) => {
  res.json(walletStore);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
