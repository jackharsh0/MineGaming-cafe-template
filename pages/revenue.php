<?php
include 'header.php';
?>

<div class="space-y-6">
  <!-- Revenue Aggregate Metric Cards -->
  <div class="dashboard-grid">
    <!-- Daily Revenue Card -->
    <div class="widget-card cyan">
      <div class="widget-title flex items-center gap-2">
        <i class="fa-solid fa-calendar-day text-wood"></i>
        <span>Daily Revenue</span>
      </div>
      <div class="widget-value text-wood" id="revenue-daily">₹0.00</div>
      <div class="text-[10px] text-slate-500 mt-2 font-cyber tracking-wider">COMPLETED TODAY</div>
    </div>

    <!-- Weekly Revenue Card -->
    <div class="widget-card pink">
      <div class="widget-title flex items-center gap-2">
        <i class="fa-solid fa-calendar-week text-clay"></i>
        <span>Weekly Revenue</span>
      </div>
      <div class="widget-value text-clay" id="revenue-weekly">₹0.00</div>
      <div class="text-[10px] text-slate-500 mt-2 font-cyber tracking-wider">LAST 7 DAYS TOTAL</div>
    </div>

    <!-- Monthly Revenue Card -->
    <div class="widget-card gold">
      <div class="widget-title flex items-center gap-2">
        <i class="fa-solid fa-calendar-days text-brass"></i>
        <span>Monthly Revenue</span>
      </div>
      <div class="widget-value text-brass" id="revenue-monthly">₹0.00</div>
      <div class="text-[10px] text-slate-500 mt-2 font-cyber tracking-wider">LAST 30 DAYS TOTAL</div>
    </div>
  </div>

  <!-- Chart and Graphs Row -->
  <div class="bg-parchment border border-slate-800 rounded-lg p-6">
    <div class="section-header flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
      <h3 class="text-lg font-bold text-wood flex items-center gap-2">
        <i class="fa-solid fa-chart-line"></i>
        <span>14-Day Revenue Trend</span>
      </h3>
      <div class="text-xs text-slate-400 font-cyber">SESSION & CAFE SALES COMBINED</div>
    </div>
    <div class="relative w-full h-[320px] bg-cream/50 rounded-lg p-4 border border-slate-900">
      <canvas id="revenueTrendChart" class="w-full h-full"></canvas>
    </div>
  </div>

  <!-- Detailed Payments Transactions Table -->
  <div class="bg-parchment border border-slate-800 rounded-lg p-6">
    <div class="section-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
      <h3 class="text-lg font-bold text-forest flex items-center gap-2">
        <i class="fa-solid fa-receipt"></i>
        <span>Recent Transactions History</span>
      </h3>
      
      <!-- Transaction Filters and Search -->
      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <!-- Search -->
        <div class="relative flex-grow md:flex-grow-0">
          <input type="text" id="txSearch" class="form-control text-xs py-2 pl-8 pr-4 max-w-xs" placeholder="Search customer or ref...">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
        </div>

        <!-- Filter Type -->
        <select id="filterType" class="form-control text-xs py-2 w-32">
          <option value="All">All Types</option>
          <option value="Game Session">Sessions</option>
          <option value="Cafe/Prepaid">Cafe/Prepaid</option>
        </select>

        <!-- Filter Method -->
        <select id="filterMethod" class="form-control text-xs py-2 w-36">
          <option value="All">All Methods</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="PlayHours">Play Hours</option>
          <option value="Split">Split</option>
        </select>
      </div>
    </div>

    <!-- Table content -->
    <div class="table-responsive max-h-[500px] overflow-y-auto scrollbar-thin">
      <table class="cyber-table">
        <thead class="sticky top-0 bg-parchment z-10">
          <tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Reference ID</th>
            <th>Customer Name</th>
            <th>Amount Paid</th>
            <th>Payment Method</th>
          </tr>
        </thead>
        <tbody id="transactions-table-body">
          <tr>
            <td colspan="6" class="text-center py-8 text-slate-500">
              <i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading transactions database...
            </td>
          </tr>
        </tbody>
      </table>
  </div>
</div>

<!-- Receipt Details Modal -->
<div id="modal-receipt-view" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-md">
    <div class="modal-header border-b border-slate-800">
      <h3 class="modal-title text-wood font-cyber flex items-center gap-2">
        <i class="fa-solid fa-receipt"></i>
        <span>Transaction Receipt</span>
      </h3>
      <button class="btn-modal-close text-slate-400 hover:text-clay transition" onclick="closeModal('modal-receipt-view')">&times;</button>
    </div>
    <div class="modal-body space-y-4 max-h-[60vh] overflow-y-auto" id="receipt-modal-content">
      <!-- Populated dynamically via JS -->
    </div>
    <div class="modal-footer border-t border-slate-800">
      <button type="button" class="btn btn-secondary text-xs" onclick="closeModal('modal-receipt-view')">Close</button>
      <button type="button" class="btn btn-primary text-xs" onclick="window.print()"><i class="fa-solid fa-print mr-1"></i> Print</button>
    </div>
  </div>
</div>

<?php
include 'footer.php';
?>
