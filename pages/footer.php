<?php if ($current_page !== 'login.php' && $current_page !== 'customer_login.php' && $current_page !== 'customer_dashboard.php'): ?>
    </main>
  </div>
</div>
<?php endif; ?>

<!-- Core JavaScript Configurations -->
<script>
  <?php require_once __DIR__ . '/../config.php'; ?>
  window.BACKEND_URL = <?php echo json_encode(BACKEND_URL . '/api'); ?>;
  window.JWT_TOKEN = <?php echo json_encode(isset($_SESSION["jwt_token"]) ? $_SESSION["jwt_token"] : ""); ?>;
  window.CURRENT_USER_ID = <?php echo json_encode(isset($_SESSION["user_id"]) ? $_SESSION["user_id"] : ""); ?>;
  window.CURRENT_USER_ROLE = <?php echo json_encode(isset($_SESSION["role"]) ? $_SESSION["role"] : ""); ?>;
</script>

<script src="../js/app.js"></script>

<!-- Dynamic Page Script Inclusion -->
<?php
switch ($current_page) {
    case 'dashboard.php':
        echo '<script src="../js/sse.js"></script>';
        echo '<script src="../js/dashboard.js"></script>';
        break;
    case 'appointments.php':
        echo '<script src="../js/sse.js"></script>';
        echo '<script src="../js/appointments.js"></script>';
        break;
    case 'sessions.php':
        echo '<script src="../js/sse.js"></script>';
        echo '<script src="../js/sessions.js"></script>';
        break;
    case 'stations.php':
        echo '<script src="../js/stations.js"></script>';
        break;
    case 'food_tables.php':
        // app.js already loaded globally above
        break;
    case 'players.php':
        echo '<script src="../js/players.js"></script>';
        break;
    case 'pos.php':
        echo '<script src="../js/pos.js"></script>';
        break;
    case 'billing.php':
        echo '<script src="../js/billing.js"></script>';
        break;
    case 'staff.php':
        echo '<script src="../js/staff.js"></script>';
        break;
    case 'manage_users.php':
        echo '<script src="../js/users.js"></script>';
        break;
    case 'revenue.php':
        echo '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';
        echo '<script src="../js/revenue.js"></script>';
        break;
    case 'whatsapp.php':
        echo '<script src="../js/sse.js"></script>';
        break;
    case 'settings.php':
        break; // settings-page.js loaded inline in settings.php
}
?>

<!-- Custom Reusable Confirmation Modal -->
<div id="modal-confirm-action" class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-container max-w-sm">
    <div class="modal-header">
      <h3 class="modal-title text-rust font-cyber uppercase" id="confirm-modal-title">Confirm Action</h3>
      <button class="btn-modal-close" onclick="closeModal('modal-confirm-action')">&times;</button>
    </div>
    <div class="modal-body">
      <p id="confirm-modal-message" class="text-sm text-slate-300">Are you sure you want to perform this action?</p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeModal('modal-confirm-action')">Cancel</button>
      <button type="button" id="btn-confirm-action-submit" class="btn btn-danger">Confirm</button>
    </div>
  </div>
</div>

</body>
</html>
