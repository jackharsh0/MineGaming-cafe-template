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

let allCategories = [];
let activeCategoryTab = 'ALL';

async function loadInventory() {
  const grid = document.getElementById('catalog-item-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="col-span-full py-12 text-center text-slate-500">
      <i class="fa-solid fa-spinner fa-spin mr-2 text-2xl text-wood mb-2"></i>
      <p>Loading catalog items...</p>
    </div>
  `;

  try {
    // 1. Fetch categories
    const categoriesData = await apiFetch('/categories');
    if (categoriesData.success) {
      allCategories = categoriesData.categories;
      populateCategoryDropdown();
    }

    // 2. Fetch inventory
    const data = await apiFetch('/inventory');
    if (data.success) {
      allInventory = data.inventory;
      renderCategoryTabs();
      // Retain active category selection on reload
      if (activeCategoryTab === 'ALL') {
        renderCatalog(data.inventory);
      } else {
        filterCatalog(activeCategoryTab);
      }
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-rust font-bold">Failed to load catalog: ${err.message}</div>
    `;
  }
}

function renderCategoryTabs() {
  const container = document.getElementById('catalog-categories-tabs');
  if (!container) return;
  container.innerHTML = '';

  // "All" tab
  const allTab = document.createElement('button');
  allTab.className = `status-chip px-4 py-1.5 rounded-full text-xs font-cyber transition ${activeCategoryTab === 'ALL' ? 'active bg-wood text-cream border-2 border-wood shadow-sm' : 'bg-kraft border-2 border-slate-800/40 text-slate-400 hover:border-wood hover:text-wood'}`;
  allTab.innerHTML = `📋 All`;
  allTab.onclick = () => {
    activeCategoryTab = 'ALL';
    renderCategoryTabs();
    renderCatalog(allInventory);
  };
  container.appendChild(allTab);

  // Dynamic category tabs
  allCategories.forEach(cat => {
    const tab = document.createElement('button');
    const isActive = activeCategoryTab === cat.id;
    tab.className = `status-chip px-4 py-1.5 rounded-full text-xs font-cyber transition ${isActive ? 'active bg-wood text-cream border-2 border-wood shadow-sm' : 'bg-kraft border-2 border-slate-800/40 text-slate-400 hover:border-wood hover:text-wood'}`;
    tab.innerHTML = `${cat.icon} ${cat.name}`;
    tab.onclick = () => {
      activeCategoryTab = cat.id;
      renderCategoryTabs();
      filterCatalog(cat.id);
    };
    container.appendChild(tab);
  });

  // "Uncategorized" tab (if any items lack a category)
  const hasUncategorized = allInventory.some(item => !item.category_id && item.id !== 999 && item.id !== 1000);
  if (hasUncategorized) {
    const uncatTab = document.createElement('button');
    const isActive = activeCategoryTab === 'UNCATEGORIZED';
    uncatTab.className = `status-chip px-4 py-1.5 rounded-full text-xs font-cyber transition ${isActive ? 'active bg-wood text-cream border-2 border-wood shadow-sm' : 'bg-kraft border-2 border-slate-800/40 text-slate-400 hover:border-wood hover:text-wood'}`;
    uncatTab.innerHTML = `📦 Uncategorized`;
    uncatTab.onclick = () => {
      activeCategoryTab = 'UNCATEGORIZED';
      renderCategoryTabs();
      filterCatalog('UNCATEGORIZED');
    };
    container.appendChild(uncatTab);
  }
}

function populateCategoryDropdown() {
  const select = document.getElementById('crud-item-category');
  if (!select) return;
  select.innerHTML = '';
  allCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.innerText = `${cat.icon} ${cat.name}`;
    select.appendChild(opt);
  });
}

function renderCatalog(items) {
  const grid = document.getElementById('catalog-item-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Exclude placeholder item console charges (id = 999 and id = 1000) from being rendered in catalog
  const displayItems = items.filter(item => item.id !== 999 && item.id !== 1000);

  if (displayItems.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500">No items available in this category.</div>
    `;
    return;
  }

  displayItems.forEach(item => {
    const card = document.createElement('div');
    const isOutOfStock = item.stock_qty <= 0;
    card.className = `catalog-item-card relative ${isOutOfStock ? 'opacity-50' : ''}`;
    
    let isLow = item.stock_qty <= item.low_stock_threshold;
    let stockClass = isOutOfStock ? 'catalog-item-stock text-rust font-bold' : isLow ? 'catalog-item-stock low' : 'catalog-item-stock';
    let icon = item.category_icon || (item.type === 'Drink' ? '🥤' : item.type === 'Snack' ? '🍜' : item.type === 'Merchandise' ? '👕' : '📦');

    // Highlight low stock / out of stock
    let alertBorder = isOutOfStock ? 'border-rust/20' : isLow ? 'border-rust/30' : '';
    if (alertBorder) card.className += ` ${alertBorder}`;

    card.innerHTML = `
      <!-- Manager actions overlay -->
      ${window.CURRENT_USER_ROLE !== 'Attendant' ? `
        <div class="absolute top-2 right-2 flex gap-1 z-10">
          <button onclick="event.stopPropagation(); triggerEditInventory(${item.id})" class="text-[10px] bg-slate-900 border border-slate-700 hover:border-wood p-1 rounded text-slate-300" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="event.stopPropagation(); deleteInventoryItem(${item.id}, '${item.name}')" class="text-[10px] bg-slate-900 border border-slate-700 hover:border-clay p-1 rounded text-slate-300" title="Delete">
            <i class="fa-solid fa-trash-can text-rust"></i>
          </button>
        </div>
      ` : ''}
      <div class="catalog-item-icon">${icon}</div>
      <div class="catalog-item-name text-slate-200" title="${item.name}">${item.name}</div>
      <div class="catalog-item-price">₹${parseFloat(item.price).toFixed(2)}</div>
      <div class="${stockClass}">${isOutOfStock ? 'Out of Stock' : `Stock: ${item.stock_qty} ${isLow ? '(Low)' : ''}`}</div>
      
      <button onclick="addToCart(${item.id})" class="btn btn-primary btn-sm w-full mt-3 ${isOutOfStock ? 'opacity-30 pointer-events-none' : ''}" ${isOutOfStock ? 'disabled' : ''}>
        <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Out of Stock' : 'Add'}
      </button>
    `;

    grid.appendChild(card);
  });
}

function filterCatalog(categoryId) {
  if (categoryId === 'ALL') {
    renderCatalog(allInventory);
  } else if (categoryId === 'UNCATEGORIZED') {
    const filtered = allInventory.filter(item => !item.category_id);
    renderCatalog(filtered);
  } else {
    const filtered = allInventory.filter(item => item.category_id === categoryId);
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
        if (!player.is_blacklisted && player.play_hours > 0) {
          const opt = document.createElement('option');
          opt.value = player.id;
          opt.innerText = `${player.name} (Play Hours: ${parseFloat(player.play_hours).toFixed(2)} Hrs)`;
          select.appendChild(opt);
        }
      });
      // Initialize premium selection slider (guest not allowed for Play Hours billing)
      if (typeof initMemberSlider === 'function') {
        initMemberSlider('checkout-player-id', 'id', false);
      }
    }
  } catch (err) {
    console.error('Failed to load players for play hours:', err);
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
        <div class="text-[10px] text-wood">₹${item.price.toFixed(2)} each</div>
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
  const walletGroup = document.getElementById('checkout-play-hours-player-group');

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
  const walletGroup = document.getElementById('checkout-play-hours-player-group');
  if (method === 'PlayHours') {
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

  if (saleType === 'Direct' && paymentMethod === 'PlayHours' && !playerId) {
    showToast('Please select play hours account', 'warning');
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
  populateCategoryDropdown();
  if (allCategories.length > 0) {
    document.getElementById('crud-item-category').value = allCategories[0].id;
  }
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
    populateCategoryDropdown();
    if (item.category_id) {
      document.getElementById('crud-item-category').value = item.category_id;
    }
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
  const category_id = parseInt(document.getElementById('crud-item-category').value) || null;
  const price = parseFloat(document.getElementById('crud-item-price').value);
  const stock_qty = parseInt(document.getElementById('crud-item-stock').value);
  const low_stock_threshold = parseInt(document.getElementById('crud-item-threshold').value);

  // Set type dynamically for backwards compatibility (reports)
  let legacyType = 'Other';
  const selectedCat = allCategories.find(c => c.id === category_id);
  if (selectedCat) {
    const catName = selectedCat.name.toLowerCase();
    if (catName.includes('snack') || catName.includes('meal') || catName.includes('food')) {
      legacyType = 'Snack';
    } else if (catName.includes('beverage') || catName.includes('drink') || catName.includes('coffee') || catName.includes('tea')) {
      legacyType = 'Drink';
    } else if (catName.includes('merch')) {
      legacyType = 'Merchandise';
    }
  }

  const endpoint = id ? `/inventory/${id}` : '/inventory';
  const method = id ? 'PUT' : 'POST';

  try {
    await apiFetch(endpoint, {
      method,
      body: JSON.stringify({
        name,
        type: legacyType,
        price,
        stock_qty,
        low_stock_threshold,
        category_id
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

// Category Manager functions
function openCategoryManager() {
  renderManageCategoriesList();
  openModal('modal-categories-management');
}

function renderManageCategoriesList() {
  const container = document.getElementById('categories-manage-list');
  if (!container) return;
  container.innerHTML = '';

  if (allCategories.length === 0) {
    container.innerHTML = '<p class="text-center text-xs text-slate-500 py-4">No categories created yet.</p>';
    return;
  }

  allCategories.forEach((cat, idx) => {
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center bg-kraft border border-slate-700/60 p-2 rounded text-sm mb-1.5';
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span onclick="editCategoryIcon(${cat.id}, '${cat.icon}')" class="cursor-pointer text-base bg-slate-900 px-2 py-0.5 rounded border border-slate-700 hover:border-wood" title="Click to edit emoji">${cat.icon}</span>
        <span onclick="editCategoryName(${cat.id}, '${cat.name}')" class="font-bold text-slate-200 cursor-pointer hover:underline" title="Click to edit name">${cat.name}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <!-- Reorder buttons -->
        <button onclick="moveCategory(${cat.id}, 'up')" class="text-slate-400 hover:text-wood px-1" ${idx === 0 ? 'disabled style="opacity: 0.3;"' : ''}><i class="fa-solid fa-chevron-up"></i></button>
        <button onclick="moveCategory(${cat.id}, 'down')" class="text-slate-400 hover:text-wood px-1" ${idx === allCategories.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}><i class="fa-solid fa-chevron-down"></i></button>
        <!-- Delete button -->
        <button onclick="deleteCategory(${cat.id}, '${cat.name}')" class="text-rust hover:text-red-400 px-1 ml-2"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    container.appendChild(row);
  });
}

// Add category form submit
document.getElementById('form-category-add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('cat-add-name').value.trim();
  const icon = document.getElementById('cat-add-icon').value.trim();
  const display_order = allCategories.length + 1;

  try {
    const res = await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, icon, display_order })
    });
    if (res.success) {
      showToast('Category created successfully!', 'success');
      document.getElementById('cat-add-name').value = '';
      document.getElementById('cat-add-icon').value = '🍿';
      await loadInventory();
      renderManageCategoriesList();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Edit Category Name
async function editCategoryName(id, currentName) {
  const newName = prompt('Enter new category name:', currentName);
  if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

  const cat = allCategories.find(c => c.id === id);
  try {
    const res = await apiFetch(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: newName.trim(),
        icon: cat.icon,
        display_order: cat.display_order,
        is_active: cat.is_active
      })
    });
    if (res.success) {
      showToast('Category name updated!', 'success');
      await loadInventory();
      renderManageCategoriesList();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Edit Category Icon
async function editCategoryIcon(id, currentIcon) {
  const newIcon = prompt('Enter new emoji icon for this category:', currentIcon);
  if (!newIcon || newIcon.trim() === '' || newIcon.trim() === currentIcon) return;

  const cat = allCategories.find(c => c.id === id);
  try {
    const res = await apiFetch(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: cat.name,
        icon: newIcon.trim(),
        display_order: cat.display_order,
        is_active: cat.is_active
      })
    });
    if (res.success) {
      showToast('Category icon updated!', 'success');
      await loadInventory();
      renderManageCategoriesList();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete Category
function deleteCategory(id, name) {
  showConfirm('Delete Category', `Are you sure you want to delete "${name}"? Linked items will become Uncategorized.`, async () => {
    try {
      const res = await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      if (res.success) {
        showToast(`Category "${name}" deleted successfully!`, 'success');
        activeCategoryTab = 'ALL';
        await loadInventory();
        renderManageCategoriesList();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Move category display order Up or Down
async function moveCategory(id, direction) {
  const idx = allCategories.findIndex(c => c.id === id);
  if (idx === -1) return;

  let targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= allCategories.length) return;

  const currentCat = allCategories[idx];
  const targetCat = allCategories[targetIdx];

  const currentOrder = currentCat.display_order;
  currentCat.display_order = targetCat.display_order;
  targetCat.display_order = currentOrder;

  const orderPayload = [
    { id: currentCat.id, display_order: currentCat.display_order },
    { id: targetCat.id, display_order: targetCat.display_order }
  ];

  try {
    const res = await apiFetch('/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ order: orderPayload })
    });
    if (res.success) {
      showToast('Reordered!', 'success');
      await loadInventory();
      renderManageCategoriesList();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
