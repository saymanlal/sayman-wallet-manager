let wallets = [];
let activeWallet = null;
let currentNetwork = 'testnet';

const networkEndpoints = {
  'testnet': 'http://localhost:3000/api',
  'public-testnet': 'https://sayman.onrender.com/api',
  'mainnet': 'http://localhost:3001/api'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadWallets();
  renderWallets();
});

// Network switching
function switchNetwork(network) {
  currentNetwork = network;
  
  document.querySelectorAll('.network-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  renderWallets();
  showAlert('success', `Switched to ${network}`);
}

function getApiBase() {
  return networkEndpoints[currentNetwork];
}

// Load wallets from localStorage
function loadWallets() {
  const saved = localStorage.getItem('sayman_wallets');
  if (saved) {
    wallets = JSON.parse(saved);
  }
}

// Save wallets to localStorage
function saveWallets() {
  localStorage.setItem('sayman_wallets', JSON.stringify(wallets));
}

// Render wallet list
async function renderWallets() {
  const list = document.getElementById('wallet-list');
  const count = document.getElementById('wallet-count');
  
  count.textContent = wallets.length;
  
  if (wallets.length === 0) {
    list.innerHTML = '<div style="text-align: center; color: var(--mono-400); padding: calc(var(--grid) * 8);">No wallets yet. Create one to get started.</div>';
    return;
  }
  
  list.innerHTML = '';
  
  for (const wallet of wallets) {
    const card = document.createElement('div');
    card.className = 'wallet-card';
    if (activeWallet && activeWallet.address === wallet.address) {
      card.classList.add('active');
    }
    
    // Fetch balance
    let balance = '0';
    let stake = '0';
    try {
      const res = await fetch(`${getApiBase()}/address/${wallet.address}`);
      const data = await res.json();
      balance = data.balance || 0;
      stake = data.stake || 0;
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
    
    card.innerHTML = `
      <div class="wallet-info">
        <div class="wallet-label">${wallet.name || 'Unnamed Wallet'}</div>
        <div class="wallet-address">${wallet.address.substring(0, 16)}...${wallet.address.substring(36)}</div>
        <div class="wallet-balance">${balance} SAYM ${stake > 0 ? `(+${stake} staked)` : ''}</div>
      </div>
      <div class="wallet-actions">
        <button class="btn" onclick="selectWallet('${wallet.address}')">Select</button>
        <button class="btn" onclick="showWalletDetails('${wallet.address}')">Details</button>
        <button class="btn btn-danger" onclick="deleteWallet('${wallet.address}')">Delete</button>
      </div>
    `;
    
    list.appendChild(card);
  }
}

// Create wallet
async function createWallet() {
  try {
    const name = document.getElementById('wallet-name').value.trim() || 'Wallet ' + (wallets.length + 1);
    
    const wallet = new SaymanWallet();
    await wallet.initialize();
    
    const newWallet = {
      name,
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      createdAt: Date.now()
    };
    
    wallets.push(newWallet);
    saveWallets();
    renderWallets();
    
    document.getElementById('create-result').innerHTML = `
      <div class="alert alert-success" style="margin-top: 16px;">
        <strong>Wallet Created!</strong><br>
        Address: <code>${wallet.address}</code><br><br>
        <strong>⚠️ SAVE YOUR PRIVATE KEY:</strong><br>
        <textarea readonly style="width: 100%; margin-top: 8px; font-size: 11px;">${wallet.privateKey}</textarea>
      </div>
    `;
    
    document.getElementById('wallet-name').value = '';
    
  } catch (error) {
    showAlert('error', 'Error creating wallet: ' + error.message);
  }
}

// Import wallet
async function importWallet() {
  try {
    const name = document.getElementById('import-name').value.trim() || 'Imported Wallet';
    const privateKey = document.getElementById('import-key').value.trim();
    
    if (!privateKey) {
      showAlert('error', 'Please enter a private key');
      return;
    }
    
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    // Check if wallet already exists
    if (wallets.find(w => w.address === wallet.address)) {
      showAlert('error', 'This wallet already exists');
      return;
    }
    
    const newWallet = {
      name,
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      createdAt: Date.now()
    };
    
    wallets.push(newWallet);
    saveWallets();
    renderWallets();
    closeModal('import');
    
    showAlert('success', 'Wallet imported successfully!');
    
  } catch (error) {
    showAlert('error', 'Invalid private key');
  }
}

// Select wallet
function selectWallet(address) {
  activeWallet = wallets.find(w => w.address === address);
  renderWallets();
  document.getElementById('active-wallet-section').style.display = 'block';
  showAlert('success', `Selected wallet: ${address.substring(0, 16)}...`);
}

// Show wallet details
async function showWalletDetails(address) {
  const wallet = wallets.find(w => w.address === address);
  if (!wallet) return;
  
  let balance = '0';
  let stake = '0';
  let nonce = '0';
  
  try {
    const res = await fetch(`${getApiBase()}/address/${wallet.address}`);
    const data = await res.json();
    balance = data.balance || 0;
    stake = data.stake || 0;
    nonce = data.nonce || 0;
  } catch (error) {
    console.error('Error fetching details:', error);
  }
  
  const content = document.getElementById('wallet-details-content');
  content.innerHTML = `
    <div class="input-group">
      <label class="input-label">Name</label>
      <input type="text" value="${wallet.name}" readonly>
    </div>
    <div class="input-group">
      <label class="input-label">Address</label>
      <input type="text" value="${wallet.address}" readonly class="mono">
    </div>
    <div class="input-group">
      <label class="input-label">Balance</label>
      <input type="text" value="${balance} SAYM" readonly>
    </div>
    <div class="input-group">
      <label class="input-label">Staked</label>
      <input type="text" value="${stake} SAYM" readonly>
    </div>
    <div class="input-group">
      <label class="input-label">Nonce</label>
      <input type="text" value="${nonce}" readonly>
    </div>
    <div class="input-group">
      <label class="input-label">Private Key</label>
      <textarea readonly class="mono" style="font-size: 11px;">${wallet.privateKey}</textarea>
      <div class="alert alert-warning" style="margin-top: 8px;">
        <strong>⚠️ Never share your private key with anyone!</strong>
      </div>
    </div>
    <div class="input-group">
      <label class="input-label">Created</label>
      <input type="text" value="${new Date(wallet.createdAt).toLocaleString()}" readonly>
    </div>
  `;
  
  openModal('details');
}

// Delete wallet
function deleteWallet(address) {
  if (!confirm('Are you sure you want to delete this wallet? This action cannot be undone!')) {
    return;
  }
  
  wallets = wallets.filter(w => w.address !== address);
  
  if (activeWallet && activeWallet.address === address) {
    activeWallet = null;
    document.getElementById('active-wallet-section').style.display = 'none';
  }
  
  saveWallets();
  renderWallets();
  showAlert('success', 'Wallet deleted');
}

// Send transaction
async function sendTransaction() {
  if (!activeWallet) {
    showAlert('error', 'Please select a wallet first');
    return;
  }
  
  try {
    const to = document.getElementById('send-to').value.trim();
    const amount = parseFloat(document.getElementById('send-amount').value);
    
    if (!to || !amount) {
      showAlert('error', 'Please fill all fields');
      return;
    }
    
    const wallet = new SaymanWallet(activeWallet.privateKey);
    await wallet.initialize();
    
    const addressRes = await fetch(`${getApiBase()}/address/${wallet.address}`);
    const addressData = await addressRes.json();
    const nonce = addressData.nonce || 0;
    
    const gasEstimate = await fetch(`${getApiBase()}/estimate-gas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'TRANSFER',
        data: { from: wallet.address, to, amount }
      })
    });
    const gas = await gasEstimate.json();
    
    const txData = {
      type: 'TRANSFER',
      data: { from: wallet.address, to, amount },
      timestamp: Date.now(),
      gasLimit: gas.recommendedGasLimit,
      gasPrice: gas.minGasPrice,
      nonce: nonce
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: wallet.publicKey
    };
    
    const res = await fetch(`${getApiBase()}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });
    
    const result = await res.json();
    
    if (result.success) {
      document.getElementById('send-result').innerHTML = `
        <div class="alert alert-success" style="margin-top: 16px;">
          <strong>Transaction Broadcast!</strong><br>
          TX ID: <code>${result.txId.substring(0, 16)}...</code>
        </div>
      `;
      
      document.getElementById('send-to').value = '';
      document.getElementById('send-amount').value = '';
      
      setTimeout(renderWallets, 2000);
    } else {
      showAlert('error', result.error || 'Transaction failed');
    }
  } catch (error) {
    showAlert('error', error.message);
  }
}

// Stake tokens
async function stakeTokens() {
  if (!activeWallet) {
    showAlert('error', 'Please select a wallet first');
    return;
  }
  
  try {
    const amount = parseFloat(document.getElementById('stake-amount').value);
    
    if (!amount) {
      showAlert('error', 'Please enter amount');
      return;
    }
    
    const wallet = new SaymanWallet(activeWallet.privateKey);
    await wallet.initialize();
    
    const addressRes = await fetch(`${getApiBase()}/address/${wallet.address}`);
    const addressData = await addressRes.json();
    const nonce = addressData.nonce || 0;
    
    const gasEstimate = await fetch(`${getApiBase()}/estimate-gas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STAKE',
        data: { from: wallet.address, amount }
      })
    });
    const gas = await gasEstimate.json();
    
    const txData = {
      type: 'STAKE',
      data: { from: wallet.address, amount },
      timestamp: Date.now(),
      gasLimit: gas.recommendedGasLimit,
      gasPrice: gas.minGasPrice,
      nonce: nonce
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: wallet.publicKey
    };
    
    const res = await fetch(`${getApiBase()}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    };
    
    const result = await res.json();
    
    if (result.success) {
      document.getElementById('stake-result').innerHTML = `
        <div class="alert alert-success" style="margin-top: 16px;">
          <strong>Stake Transaction Broadcast!</strong><br>
          TX ID: <code>${result.txId.substring(0, 16)}...</code>
        </div>
      `;
      
      document.getElementById('stake-amount').value = '';
      
      setTimeout(renderWallets, 2000);
    } else {
      showAlert('error', result.error || 'Staking failed');
    }
  } catch (error) {
    showAlert('error', error.message);
  }
}

// Unstake tokens
async function unstakeTokens() {
  if (!activeWallet) {
    showAlert('error', 'Please select a wallet first');
    return;
  }
  
  if (!confirm('Unstake all tokens?')) {
    return;
  }
  
  try {
    const wallet = new SaymanWallet(activeWallet.privateKey);
    await wallet.initialize();
    
    const addressRes = await fetch(`${getApiBase()}/address/${wallet.address}`);
    const addressData = await addressRes.json();
    const nonce = addressData.nonce || 0;
    
    const gasEstimate = await fetch(`${getApiBase()}/estimate-gas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'UNSTAKE',
        data: { from: wallet.address }
      })
    });
    const gas = await gasEstimate.json();
    
    const txData = {
      type: 'UNSTAKE',
      data: { from: wallet.address },
      timestamp: Date.now(),
      gasLimit: gas.recommendedGasLimit,
      gasPrice: gas.minGasPrice,
      nonce: nonce
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: wallet.publicKey
    };
    
    const res = await fetch(`${getApiBase()}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });
    
    const result = await res.json();
    
    if (result.success) {
      document.getElementById('stake-result').innerHTML = `
        <div class="alert alert-success" style="margin-top: 16px;">
          <strong>Unstake Transaction Broadcast!</strong><br>
          TX ID: <code>${result.txId.substring(0, 16)}...</code>
        </div>
      `;
      
      setTimeout(renderWallets, 2000);
    } else {
      showAlert('error', result.error || 'Unstaking failed');
    }
  } catch (error) {
    showAlert('error', error.message);
  }
}

// Modal controls
function openModal(id) {
  document.getElementById(`${id}-modal`).classList.add('active');
}

function closeModal(id) {
  document.getElementById(`${id}-modal`).classList.remove('active');
}

// Alert helper
function showAlert(type, message) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.top = '20px';
  alert.style.right = '20px';
  alert.style.zIndex = '10000';
  alert.style.minWidth = '300px';
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 3000);
}