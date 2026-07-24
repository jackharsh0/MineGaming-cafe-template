<?php
include 'header.php';
?>

<div class="flex flex-col xl:flex-row gap-6">
  <!-- Left Column: Snack Bar Catalog -->
  <div class="flex-grow bg-parchment border border-slate-800 rounded-lg p-6">
    <div class="section-header flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-wood flex items-center gap-2">
        <i class="fa-solid fa-cookie-bite"></i>
        <span>Snack & Beverage Catalog</span>
      </h2>
      
      <div class="flex items-center gap-2">
        <?php if ($role !== 'Attendant'): ?>
          <button onclick="openCategoryManager()" class="text-slate-400 hover:text-wood border border-slate-700 hover:border-wood px-2 py-1.5 rounded transition bg-cream/50" title="Manage Categories">
            <i class="fa-solid fa-gear"></i>
          </button>
          <button onclick="triggerAddInventory()" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-plus mr-1"></i> Add Item
          </button>
        <?php endif; ?>
      </div>
    </div>

    <!-- Categories Tab Bar -->
    <div class="flex items-center justify-between mb-6 border-b border-slate-800/40 pb-3">
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap" id="catalog-categories-tabs" style="-ms-overflow-style: none; scrollbar-width: none;">
        <!-- Populated dynamically by JS -->
      </div>
    </div>

    <!-- Catalog Grid -->
    <div class="pos-catalog-grid" id="catalog-item-grid">
      <div class="col-span-full py-12 text-center text-slate-500">
        <i class="fa-solid fa-spinner fa-spin mr-2 text-2xl text-wood mb-2"></i>
        <p>Retrieving cafe inventory items...</p>
      </div>
    </div>
  </div>

  <!-- Right Column: Shopping Cart & Checkout panel -->
  <div class="w-full xl:w-96 shrink-0 bg-parchment border border-slate-800 rounded-lg p-6 flex flex-col h-[600px]">
    <h3 class="text-lg font-bold font-cyber text-clay border-b border-slate-800 pb-3 mb-4 uppercase tracking-wider">
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
      <div class="flex justify-between text-lg font-bold text-slate-100 border-t border-slate-800 pt-2">
        <span>CART TOTAL:</span>
        <span id="cart-total" class="text-wood">₹0.00</span>
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
        <label class="form-label">Active Station / Table</label>
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
          <option value="PlayHours">Play Hours</option>
        </select>
      </div>

      <!-- Play Hours Player search (For Direct Play Hours payments) -->
      <div class="form-group mb-0" id="checkout-play-hours-player-group" style="display: none;">
        <label class="form-label">Debit from Player's Play Hours</label>
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
<div id="modal-inventory-crud" class="modal-overlay" role="dialog" aria-modal="true">
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
            <label class="form-label" for="crud-item-category">Category</label>
            <select id="crud-item-category" class="form-control" required>
              <!-- Loaded dynamically by JS -->
            </select>
            <input type="hidden" id="crud-item-type" value="Other">
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

<!-- Category Management Modal (SuperAdmin/Manager only) -->
<div id="modal-categories-management" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-lg">
    <div class="modal-header">
      <h3 class="modal-title font-cyber text-wood"><i class="fa-solid fa-folder-open text-clay mr-2"></i>Manage Categories</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-categories-management')">&times;</button>
    </div>
    <div class="modal-body space-y-4">
      <!-- Add New Category Form inline -->
      <form id="form-category-add" class="p-3 bg-kraft border border-slate-700 rounded grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div class="form-group md:col-span-2 mb-0">
          <label class="form-label text-xs" for="cat-add-name">New Category Name</label>
          <input type="text" id="cat-add-name" class="form-control" placeholder="e.g. Desserts" required>
        </div>
        <div class="form-group mb-0">
          <label class="form-label text-xs" for="cat-add-icon">Emoji Icon</label>
          <input type="text" id="cat-add-icon" class="form-control text-center" placeholder="🍰" maxlength="4" required>
        </div>
        <button type="submit" class="btn btn-primary w-full py-2 hover-3d-lift">Add</button>
      </form>

      <!-- Categories List for Edit / Delete / Reorder -->
      <div class="border border-slate-800 rounded bg-slate-900/40 p-2 max-h-[300px] overflow-y-auto space-y-2" id="categories-manage-list">
        <!-- Loaded dynamically by JS -->
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary w-full" onclick="closeModal('modal-categories-management')">Close</button>
    </div>
  </div>
</div>

<?php
include 'footer.php';
?>
