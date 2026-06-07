<?php
include 'header.php';
?>

<div class="flex flex-col xl:flex-row gap-6">
  <!-- Left Column: Snack Bar Catalog -->
  <div class="flex-grow bg-cyberPanel border border-slate-800 rounded-lg p-6">
    <div class="section-header flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-neonCyan flex items-center gap-2">
        <i class="fa-solid fa-cookie-bite"></i>
        <span>Snack & Beverage Catalog</span>
      </h2>
      
      <div class="flex gap-2">
        <select id="catalog-filter" onchange="filterCatalog(this.value)" class="bg-cyberDark border border-slate-700 px-3 py-1 text-sm rounded text-slate-300 focus:outline-none focus:border-neonCyan">
          <option value="ALL">All Categories</option>
          <option value="Snack">Snacks & Food</option>
          <option value="Drink">Beverages</option>
          <option value="Merchandise">Merchandise</option>
          <option value="Other">Other Items</option>
        </select>
        
        <?php if ($role !== 'Attendant'): ?>
          <button onclick="triggerAddInventory()" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-plus mr-1"></i> Add Item
          </button>
        <?php endif; ?>
      </div>
    </div>

    <!-- Catalog Grid -->
    <div class="pos-catalog-grid" id="catalog-item-grid">
      <div class="col-span-full py-12 text-center text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2 text-2xl text-neonCyan mb-2"></i>
        <p>Retrieving cafe inventory items...</p>
      </div>
    </div>
  </div>

  <!-- Right Column: Shopping Cart & Checkout panel -->
  <div class="w-full xl:w-96 shrink-0 bg-cyberPanel border border-slate-800 rounded-lg p-6 flex flex-col h-[600px]">
    <h3 class="text-lg font-bold font-cyber text-neonPink border-b border-slate-800 pb-3 mb-4 uppercase tracking-wider">
      <i class="fa-solid fa-cart-shopping mr-2"></i>Operator Checkout Cart
    </h3>

    <!-- Cart list -->
    <div class="flex-grow overflow-y-auto pr-1 space-y-3" id="cart-items-list">
      <div class="text-center py-12 text-slate-500 text-sm">
        <i class="fa-solid fa-basket-shopping text-3xl text-slate-600 mb-2"></i>
        <p>Cart is empty.</p>
        <p class="text-xs text-slate-600 mt-1">Click catalog items to add to cart.</p>
      </div>
    </div>

    <!-- Pricing Summary -->
    <div class="border-t border-slate-800 pt-4 mt-4 space-y-2 font-cyber">
      <div class="flex justify-between text-sm text-slate-400">
        <span>SUBTOTAL:</span>
        <span id="cart-subtotal">₹0.00</span>
      </div>
      <div class="flex justify-between text-sm text-slate-400">
        <span>TAX/GST (10%):</span>
        <span id="cart-tax">₹0.00</span>
      </div>
      <div class="flex justify-between text-lg font-bold text-white border-t border-slate-850 pt-2">
        <span>CART TOTAL:</span>
        <span id="cart-total" class="text-neonCyan">₹0.00</span>
      </div>
    </div>

    <!-- Action Forms -->
    <form id="form-pos-checkout" class="mt-4 space-y-4">
      <div class="form-group mb-0">
        <label class="form-label">Checkout Type</label>
        <select id="checkout-type" class="form-control" onchange="toggleCheckoutTarget(this.value)">
          <option value="Direct">Standalone Direct Sale</option>
          <option value="SessionBill">Assign to Active Session</option>
        </select>
      </div>

      <!-- Station selection (For SessionBill checkout) -->
      <div class="form-group mb-0" id="checkout-station-group" style="display: none;">
        <label class="form-label">Active Station Terminal</label>
        <select id="checkout-session-id" class="form-control">
          <!-- Populated with active sessions -->
        </select>
      </div>

      <!-- Payment Method Selection (For Direct checkout) -->
      <div class="form-group mb-0" id="checkout-payment-group">
        <label class="form-label">Payment Method</label>
        <select id="checkout-payment-method" class="form-control" onchange="togglePOSWalletInput(this.value)">
          <option value="Cash">Cash</option>
          <option value="Card">Credit/Debit Card</option>
          <option value="Wallet">Digital Wallet Balance</option>
        </select>
      </div>

      <!-- Wallet Player search (For Direct Wallet payments) -->
      <div class="form-group mb-0" id="checkout-wallet-player-group" style="display: none;">
        <label class="form-label">Debit from Player Wallet</label>
        <select id="checkout-player-id" class="form-control">
          <option value="">-- Choose Registered Customer --</option>
          <!-- Populated by JS -->
        </select>
      </div>

      <button type="submit" class="w-full btn btn-primary py-3 tracking-wider font-cyber">
        <i class="fa-solid fa-circle-check"></i> Complete Purchase
      </button>
    </form>
  </div>
</div>

<!-- ==========================================
     INVENTORY MODAL (Add/Edit items - Manager only)
     ========================================== -->
<div id="modal-inventory-crud" class="modal-overlay">
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title" id="inventory-modal-title">Add Catalog Item</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-inventory-crud')">&times;</button>
    </div>
    <form id="form-inventory-crud">
      <input type="hidden" id="crud-item-id" value="">
      <div class="modal-body space-y-4">
        <div class="form-group">
          <label class="form-label" for="crud-item-name">Item Name</label>
          <input type="text" id="crud-item-name" class="form-control" placeholder="e.g. Red Bull 250ml" required>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-item-type">Category</label>
            <select id="crud-item-type" class="form-control" required>
              <option value="Drink">Drink / Beverage</option>
              <option value="Snack">Snacks & Food</option>
              <option value="Merchandise">Merchandise</option>
              <option value="Other">Other Items</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-item-price">Unit Sale Price (₹)</label>
            <input type="number" step="0.05" min="0" id="crud-item-price" class="form-control" required>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label" for="crud-item-stock">Stock Count</label>
            <input type="number" min="0" id="crud-item-stock" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="crud-item-threshold">Low Stock Threshold</label>
            <input type="number" min="0" id="crud-item-threshold" value="10" class="form-control" required>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('modal-inventory-crud')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Item</button>
      </div>
    </form>
  </div>
</div>

<?php
include 'footer.php';
?>
