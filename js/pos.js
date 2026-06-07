// Cafe POS and Inventory management Client Actions

let allInventory = [];
let shoppingCart = [];

document.addEventListener('DOMContentLoaded', () => {
  loadInventory();
  loadActiveSessionsDropdown();
  loadPOSPlayersDropdown();

  // Check for pre-selected session query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const sessionUrlParam = urlParams.get('session_id') || urlParams.get('active_session');
  if (sessionUrlParam) {
    window.PRESELECTED_SESSION_ID = sessionUrlParam;
    const checkoutTypeSelect = document.getElementById('checkout-type');
    if (checkoutTypeSelect) {
      checkoutTypeSelect.value = 'SessionBill';
      toggleCheckoutTarget('SessionBill');
    }
  }
});

async function loadInventory() {
  const grid = document.getElementById('catalog-item-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="col-span-full py-12 text-center text-slate-500">
      <i class="fa-solid fa-spinner fa-spin mr-2 text-2xl text-neonCyan mb-2"></i>
      <p>Loading catalog items...</p>
    </div>
  `;

  try {
    const data = await apiFetch('/inventory');
    if (data.success) {
      allInventory = data.inventory;
      renderCatalog(data.inventory);
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-neonRed font-bold">Failed to load catalog: ${err.message}</div>
    `;
  }
}

function renderCatalog(items) {
  const grid = document.getElementById('catalog-item-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500">No items available in this category.</div>
    `;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'catalog-item-card relative';
    
    let isLow = item.stock_qty <= item.low_stock_threshold;
    let stockClass = isLow ? 'catalog-item-stock low' : 'catalog-item-stock';
    let icon = item.type === 'Drink' ? '🥤' : item.type === 'Snack' ? '🍜' : item.type === 'Merchandise' ? '👕' : '📦';

    // Highlight low stock
    let alertBorder = isLow ? 'border-neonRed/30' : '';
    if (alertBorder) card.className += ` ${alertBorder}`;

    card.innerHTML = `
      <!-- Manager actions overlay -->
      ${window.CURRENT_USER_ROLE !== 'Attendant' ? `
        <div class="absolute top-2 right-2 flex gap-1 z-10">
          <button onclick="event.stopPropagation(); triggerEditInventory(${item.id})" class="text-[10px] bg-slate-900 border border-slate-700 hover:border-neonCyan p-1 rounded text-slate-300" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="event.stopPropagation(); deleteInventoryItem(${item.id}, '${item.name}')" class="text-[10px] bg-slate-900 border border-slate-700 hover:border-neonPink p-1 rounded text-slate-300" title="Delete">
            <i class="fa-solid fa-trash-can text-neonRed"></i>
          </button>
        </div>
      ` : ''}
      <div class="catalog-item-icon">${icon}</div>
      <div class="catalog-item-name text-slate-200" title="${item.name}">${item.name}</div>
      <div class="catalog-item-price">₹${parseFloat(item.price).toFixed(2)}</div>
      <div class="${stockClass}">Stock: ${item.stock_qty} ${isLow ? '(Low)' : ''}</div>
      
      <button onclick="addToCart(${item.id})" class="btn btn-primary btn-sm w-full mt-3 ${item.stock_qty === 0 ? 'opacity-30 pointer-events-none' : ''}">
        <i class="fa-solid fa-cart-plus"></i> Add
      </button>
    `;

    grid.appendChild(card);
  });
}

function filterCatalog(category) {
  if (category === 'ALL') {
    renderCatalog(allInventory);
  } else {
    const filtered = allInventory.filter(item => item.type === category);
    renderCatalog(filtered);
  }
}

// Active Sessions Dropdown loading
async function loadActiveSessionsDropdown() {
  const select = document.getElementById('checkout-session-id');
  if (!select) return;
  select.innerHTML = '<option value="">-- Fetching sessions --</option>';

  try {
    const data = await apiFetch('/sessions/active');
    if (data.success) {
      select.innerHTML = '<option value="">-- Select Active Station --</option>';
      data.sessions.forEach(sess => {
        const opt = document.createElement('option');
        opt.value = sess.id;
        opt.innerText = `${sess.station_name} - Player: ${sess.player_name || 'Guest'}`;
        select.appendChild(opt);
      });

      if (window.PRESELECTED_SESSION_ID) {
        select.value = window.PRESELECTED_SESSION_ID;
      }

      if (data.sessions.length === 0) {
        select.innerHTML = '<option value="">No active sessions found</option>';
      }
    }
  } catch (err) {
    console.error('Failed to load active sessions:', err);
  }
}

// POS Players dropdown (wallet billing search)
async function loadPOSPlayersDropdown() {
  const select = document.getElementById('checkout-player-id');
  if (!select) return;
  select.innerHTML = '<option value="">-- Choose Registered Customer --</option>';

  try {
    const data = await apiFetch('/players');
    if (data.success) {
      data.players.forEach(player => {
        if (!player.is_blacklisted && player.wallet_balance > 0) {
          const opt = document.createElement('option');
          opt.value = player.id;
          opt.innerText = `${player.name} (Wallet: ₹${parseFloat(player.wallet_balance).toFixed(2)})`;
          select.appendChild(opt);
        }
      });
    }
  } catch (err) {
    console.error('Failed to load players for wallet:', err);
  }
}

// Shopping Cart Core
function addToCart(itemId) {
  const item = allInventory.find(i => i.id === itemId);
  if (!item) return;

  if (item.stock_qty <= 0) {
    showToast('Out of stock', 'warning');
    return;
  }

  const existing = shoppingCart.find(c => c.itemId === itemId);
  if (existing) {
    if (existing.quantity >= item.stock_qty) {
      showToast('Maximum available stock reached', 'warning');
      return;
    }
    existing.quantity++;
  } else {
    shoppingCart.push({
      itemId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      quantity: 1
    });
  }

  updateCartView();
}

function updateCartQuantity(itemId, adjustment) {
  const cartItem = shoppingCart.find(c => c.itemId === itemId);
  const inventoryItem = allInventory.find(i => i.id === itemId);
  if (!cartItem) return;

  const newQty = cartItem.quantity + adjustment;
  if (newQty <= 0) {
    shoppingCart = shoppingCart.filter(c => c.itemId !== itemId);
  } else {
    if (adjustment > 0 && newQty > inventoryItem.stock_qty) {
      showToast('Maximum available stock reached', 'warning');
      return;
    }
    cartItem.quantity = newQty;
  }
  updateCartView();
}

function updateCartView() {
  const container = document.getElementById('cart-items-list');
  if (!container) return;
  container.innerHTML = '';

  if (shoppingCart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500 text-sm">
        <i class="fa-solid fa-basket-shopping text-3xl text-slate-600 mb-2"></i>
        <p>Cart is empty.</p>
        <p class="text-xs text-slate-600 mt-1">Click catalog items to add to cart.</p>
      </div>
    `;
    updatePricingSummary(0.00);
    return;
  }

  let cartSubtotal = 0.00;
  shoppingCart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    cartSubtotal += itemTotal;

    const row = document.createElement('div');
    row.className = 'flex justify-between items-center bg-slate-900/40 p-3 border border-slate-800 rounded text-sm';
    row.innerHTML = `
      <div class="flex-grow pr-3">
        <div class="font-bold text-slate-200 text-xs">${item.name}</div>
        <div class="text-[10px] text-neonCyan">₹${item.price.toFixed(2)} each</div>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" onclick="updateCartQuantity(${item.itemId}, -1)" class="w-6 h-6 flex items-center justify-center bg-slate-850 rounded hover:bg-slate-700 text-slate-300">-</button>
        <span class="font-bold text-xs">${item.quantity}</span>
        <button type="button" onclick="updateCartQuantity(${item.itemId}, 1)" class="w-6 h-6 flex items-center justify-center bg-slate-850 rounded hover:bg-slate-700 text-slate-300">+</button>
      </div>
    `;
    container.appendChild(row);
  });

  updatePricingSummary(cartSubtotal);
}

function updatePricingSummary(subtotal) {
  const tax = subtotal * 0.10; // 10% tax
  const total = subtotal + tax;

  document.getElementById('cart-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
  document.getElementById('cart-tax').innerText = `₹${tax.toFixed(2)}`;
  document.getElementById('cart-total').innerText = `₹${total.toFixed(2)}`;
}

// Cart checkout actions
function toggleCheckoutTarget(type) {
  const stationGroup = document.getElementById('checkout-station-group');
  const paymentGroup = document.getElementById('checkout-payment-group');
  const walletGroup = document.getElementById('checkout-wallet-player-group');

  if (type === 'SessionBill') {
    stationGroup.style.display = 'block';
    paymentGroup.style.display = 'none';
    walletGroup.style.display = 'none';
    loadActiveSessionsDropdown();
  } else {
    stationGroup.style.display = 'none';
    paymentGroup.style.display = 'block';
    togglePOSWalletInput(document.getElementById('checkout-payment-method').value);
  }
}

function togglePOSWalletInput(method) {
  const walletGroup = document.getElementById('checkout-wallet-player-group');
  if (method === 'Wallet') {
    walletGroup.style.display = 'block';
    loadPOSPlayersDropdown();
  } else {
    walletGroup.style.display = 'none';
  }
}

document.getElementById('form-pos-checkout').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (shoppingCart.length === 0) {
    showToast('Add items to cart first!', 'warning');
    return;
  }

  const saleType = document.getElementById('checkout-type').value;
  const sessionId = document.getElementById('checkout-session-id').value || null;
  const paymentMethod = document.getElementById('checkout-payment-method').value;
  const playerId = document.getElementById('checkout-player-id').value || null;

  if (saleType === 'SessionBill' && !sessionId) {
    showToast('Please select active station', 'warning');
    return;
  }

  if (saleType === 'Direct' && paymentMethod === 'Wallet' && !playerId) {
    showToast('Please select wallet account', 'warning');
    return;
  }

  const items = shoppingCart.map(c => ({
    itemId: c.itemId,
    quantity: c.quantity
  }));

  try {
    await apiFetch('/pos/checkout', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        playerId,
        saleType,
        items,
        paymentMethod
      })
    });

    shoppingCart = [];
    updateCartView();
    showToast('POS purchase completed successfully!', 'success');
    loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Inventory CRUD (Managers only)
function triggerAddInventory() {
  document.getElementById('crud-item-id').value = '';
  document.getElementById('inventory-modal-title').innerText = 'Add Inventory Item';

  document.getElementById('crud-item-name').value = '';
  document.getElementById('crud-item-type').value = 'Drink';
  document.getElementById('crud-item-price').value = '2.00';
  document.getElementById('crud-item-stock').value = '20';
  document.getElementById('crud-item-threshold').value = '10';

  openModal('modal-inventory-crud');
}

async function triggerEditInventory(id) {
  const item = allInventory.find(i => i.id === id);
  if (item) {
    document.getElementById('crud-item-id').value = item.id;
    document.getElementById('inventory-modal-title').innerText = `Edit Item: ${item.name}`;

    document.getElementById('crud-item-name').value = item.name;
    document.getElementById('crud-item-type').value = item.type;
    document.getElementById('crud-item-price').value = parseFloat(item.price).toFixed(2);
    document.getElementById('crud-item-stock').value = item.stock_qty;
    document.getElementById('crud-item-threshold').value = item.low_stock_threshold;

    openModal('modal-inventory-crud');
  }
}

document.getElementById('form-inventory-crud').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('crud-item-id').value;
  const name = document.getElementById('crud-item-name').value.trim();
  const type = document.getElementById('crud-item-type').value;
  const price = parseFloat(document.getElementById('crud-item-price').value);
  const stock_qty = parseInt(document.getElementById('crud-item-stock').value);
  const low_stock_threshold = parseInt(document.getElementById('crud-item-threshold').value);

  const endpoint = id ? `/inventory/${id}` : '/inventory';
  const method = id ? 'PUT' : 'POST';

  try {
    await apiFetch(endpoint, {
      method,
      body: JSON.stringify({
        name,
        type,
        price,
        stock_qty,
        low_stock_threshold
      })
    });

    closeModal('modal-inventory-crud');
    showToast('Catalog item updated successfully!', 'success');
    loadInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function deleteInventoryItem(id, name) {
  showConfirm('Remove Catalog Item', `Are you sure you want to remove ${name} from inventory?`, async () => {
    try {
      await apiFetch(`/inventory/${id}`, { method: 'DELETE' });
      showToast(`Deleted ${name} successfully!`, 'success');
      loadInventory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
