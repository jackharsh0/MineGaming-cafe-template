-- Gaming Zone Database Schema and Seed Data
CREATE DATABASE IF NOT EXISTS `gaming_zone`;
USE `gaming_zone`;

-- Drop tables in reverse order of dependencies to avoid constraint issues
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `pos_sale_items`;
DROP TABLE IF EXISTS `pos_sales`;
DROP TABLE IF EXISTS `inventory`;
DROP TABLE IF EXISTS `game_sessions`;
DROP TABLE IF EXISTS `pricing_rules`;
DROP TABLE IF EXISTS `players`;
DROP TABLE IF EXISTS `stations`;
DROP TABLE IF EXISTS `users_admin`;

-- 1. users_admin
CREATE TABLE `users_admin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('SuperAdmin', 'Manager', 'Attendant') NOT NULL DEFAULT 'Attendant',
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. stations
CREATE TABLE `stations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `type` ENUM('PC', 'PS5', 'Xbox', 'VR', 'Other') NOT NULL,
  `specs_cpu` VARCHAR(100) DEFAULT NULL,
  `specs_gpu` VARCHAR(100) DEFAULT NULL,
  `specs_ram` VARCHAR(50) DEFAULT NULL,
  `specs_peripherals` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `mac_address` VARCHAR(17) DEFAULT NULL,
  `status` ENUM('Available', 'Occupied', 'Maintenance') NOT NULL DEFAULT 'Available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. players
CREATE TABLE `players` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `email` VARCHAR(100) DEFAULT NULL,
  `wallet_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `loyalty_points` INT NOT NULL DEFAULT 0,
  `loyalty_tier` ENUM('Bronze', 'Silver', 'Gold') NOT NULL DEFAULT 'Bronze',
  `is_blacklisted` TINYINT(1) NOT NULL DEFAULT 0,
  `blacklist_notes` TEXT DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. pricing_rules
CREATE TABLE `pricing_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `station_type` ENUM('PC', 'PS5', 'Xbox', 'VR', 'Other') NOT NULL UNIQUE,
  `hourly_rate` DECIMAL(10,2) NOT NULL,
  `peak_hourly_rate` DECIMAL(10,2) NOT NULL,
  `peak_start_time` TIME DEFAULT '18:00:00',
  `peak_end_time` TIME DEFAULT '23:59:59',
  `controller_addon_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. game_sessions
CREATE TABLE `game_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `station_id` INT NOT NULL,
  `player_id` INT DEFAULT NULL,
  `session_type` ENUM('Prepaid', 'Postpaid') NOT NULL,
  `start_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `target_end_time` TIMESTAMP NULL DEFAULT NULL,
  `end_time` TIMESTAMP NULL DEFAULT NULL,
  `pause_time` TIMESTAMP NULL DEFAULT NULL,
  `paused_duration_seconds` INT NOT NULL DEFAULT 0,
  `hourly_rate` DECIMAL(10,2) NOT NULL,
  `controller_count` INT NOT NULL DEFAULT 1,
  `discount_applied` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_applied` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Active', 'Paused', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Active',
  `created_by` INT NOT NULL,
  FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`),
  FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users_admin`(`id`),
  INDEX idx_status (`status`),
  INDEX idx_times (`start_time`, `end_time`),
  INDEX idx_player_id (`player_id`),
  INDEX idx_station_id (`station_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. inventory
CREATE TABLE `inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `type` ENUM('Snack', 'Drink', 'Merchandise', 'Other') NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `stock_qty` INT NOT NULL DEFAULT 0,
  `low_stock_threshold` INT NOT NULL DEFAULT 10,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. pos_sales
CREATE TABLE `pos_sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT DEFAULT NULL,
  `player_id` INT DEFAULT NULL,
  `sale_type` ENUM('Direct', 'SessionBill') NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `tax` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('Cash', 'Wallet', 'Card', 'Split') NOT NULL,
  `wallet_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cash_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Paid', 'Pending') NOT NULL DEFAULT 'Paid',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users_admin`(`id`),
  INDEX idx_player_id (`player_id`),
  INDEX idx_session_id (`session_id`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. pos_sale_items
CREATE TABLE `pos_sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `pos_sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `inventory`(`id`) ON DELETE CASCADE,
  INDEX idx_sale_id (`sale_id`),
  INDEX idx_item_id (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. appointments
CREATE TABLE `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `player_name` VARCHAR(100) NOT NULL,
  `player_phone` VARCHAR(20) NOT NULL,
  `station_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON DELETE CASCADE,
  INDEX idx_times (`start_time`, `end_time`),
  INDEX idx_station_id (`station_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. audit_logs
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users_admin`(`id`),
  INDEX idx_user_id (`user_id`),
  INDEX idx_timestamp (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. coupons
CREATE TABLE `coupons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `discount_percent` DECIMAL(5,2) DEFAULT NULL,
  `discount_flat` DECIMAL(10,2) DEFAULT NULL,
  `min_spend` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ==========================================
-- SEED DATA
-- ==========================================

-- Seed Admins (Passwords are bcrypt hashes of 'admin123', 'manager123', 'attendant123')
-- Hashed using bcryptjs default ($2a$)
INSERT INTO `users_admin` (`id`, `username`, `password_hash`, `full_name`, `role`, `status`) VALUES
(1, 'admin', '$2a$10$jSth7WYGoyz5GmYtaFigwOQg/RJypnQsG8Me4.XuL.Czn9UyboPXa', 'System Administrator', 'SuperAdmin', 'Active'),
(2, 'manager', '$2a$10$bMcTpJDyFEpsbj4r9cd7u.MaXzWemo2MOMefpal01MvaHL95GzCe6', 'Lounge Manager', 'Manager', 'Active'),
(3, 'attendant', '$2a$10$NITZtZyTXaXbQxsTrvlcyeO/gNG0nuIOKyAQKtzUxQ6h4KLM7j6Z6', 'Shift Attendant', 'Attendant', 'Active');

-- Seed Pricing Rules
INSERT INTO `pricing_rules` (`station_type`, `hourly_rate`, `peak_hourly_rate`, `peak_start_time`, `peak_end_time`, `controller_addon_rate`) VALUES
('PC', 5.00, 7.50, '18:00:00', '23:59:59', 0.00),
('PS5', 6.00, 9.00, '18:00:00', '23:59:59', 2.00),
('Xbox', 6.00, 8.50, '18:00:00', '23:59:59', 1.50),
('VR', 12.00, 15.00, '18:00:00', '23:59:59', 0.00),
('Other', 4.00, 6.00, '18:00:00', '23:59:59', 1.00);

-- Seed Stations
INSERT INTO `stations` (`id`, `name`, `type`, `specs_cpu`, `specs_gpu`, `specs_ram`, `specs_peripherals`, `ip_address`, `mac_address`, `status`) VALUES
(1, 'PC-01 (Elite)', 'PC', 'Intel Core i9-13900K', 'RTX 4080', '32GB DDR5', 'Logitech G Pro Mouse, Mechanical Blue Keyboard', '192.168.1.101', '00:1A:2B:3C:4D:5E', 'Available'),
(2, 'PC-02 (Elite)', 'PC', 'Intel Core i9-13900K', 'RTX 4080', '32GB DDR5', 'Logitech G Pro Mouse, Mechanical Blue Keyboard', '192.168.1.102', '00:1A:2B:3C:4D:5F', 'Available'),
(3, 'PC-03 (Standard)', 'PC', 'Intel Core i7-12700K', 'RTX 3070', '16GB DDR4', 'Razer Deathadder, Standard Membrane Keyboard', '192.168.1.103', '00:1A:2B:3C:4D:60', 'Available'),
(4, 'PC-04 (Standard)', 'PC', 'Intel Core i7-12700K', 'RTX 3070', '16GB DDR4', 'Razer Deathadder, Standard Membrane Keyboard', '192.168.1.104', '00:1A:2B:3C:4D:61', 'Maintenance'),
(5, 'PS5-01', 'PS5', 'AMD Zen 2 Custom', 'RDNA 2 Custom', '16GB GDDR6', '2 DualSense Wireless Controllers', '192.168.1.105', '00:1A:2B:3C:4D:62', 'Available'),
(6, 'PS5-02 (4 Player)', 'PS5', 'AMD Zen 2 Custom', 'RDNA 2 Custom', '16GB GDDR6', '4 DualSense Wireless Controllers', '192.168.1.106', '00:1A:2B:3C:4D:63', 'Available'),
(7, 'Xbox-01', 'Xbox', 'AMD Custom Zen 2', 'RDNA 2 Custom', '16GB GDDR6', '2 Xbox Wireless Controllers', '192.168.1.107', '00:1A:2B:3C:4D:64', 'Available'),
(8, 'VR-Booth-01', 'VR', 'Intel Core i7-13700K', 'RTX 4070 Ti', '32GB DDR5', 'Meta Quest 3, Ceiling Mount Cables', '192.168.1.108', '00:1A:2B:3C:4D:65', 'Available');

-- Seed Players
INSERT INTO `players` (`id`, `name`, `phone`, `email`, `wallet_balance`, `loyalty_points`, `loyalty_tier`, `is_blacklisted`, `blacklist_notes`) VALUES
(1, 'Jack Reacher', '+15550199', 'jack@reacher.com', 50.00, 120, 'Silver', 0, NULL),
(2, 'Sarah Connor', '+15550188', 'sarah@skynet.com', 15.50, 45, 'Bronze', 0, NULL),
(3, 'John Doe', '+15550177', 'john@doe.com', 120.00, 350, 'Gold', 0, NULL),
(4, 'Toxic Gamer', '+15550166', 'toxic@troll.com', 0.00, 0, 'Bronze', 1, 'Banned for destructive behavior and verbal abuse towards staff on June 1st.');

-- Seed Inventory
INSERT INTO `inventory` (`name`, `type`, `price`, `stock_qty`, `low_stock_threshold`) VALUES
('Red Bull Energy Drink 250ml', 'Drink', 3.50, 24, 10),
('Monster Energy 500ml', 'Drink', 4.00, 5, 10),
('Coca-Cola Zero 330ml', 'Drink', 2.00, 40, 10),
('Lays Barbecue Chips 50g', 'Snack', 1.50, 30, 8),
('Spicy Shin Ramyun Cup Noodles', 'Snack', 3.00, 18, 10),
('Gaming Zone Premium Tee L', 'Merchandise', 20.00, 3, 5);

-- Seed Coupons
INSERT INTO `coupons` (`code`, `discount_percent`, `discount_flat`, `min_spend`, `active`) VALUES
('WELCOME10', 10.00, NULL, 0.00, 1),
('FLAT5', NULL, 5.00, 15.00, 1),
('OFF20', 20.00, NULL, 20.00, 1);
