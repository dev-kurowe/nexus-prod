-- Script untuk memperbaiki tabel loan_items setelah perubahan model
-- Hapus foreign key constraint dulu
ALTER TABLE loan_items DROP FOREIGN KEY IF EXISTS fk_loan_items_inventory;

-- Hapus kolom inventory_id
ALTER TABLE loan_items DROP COLUMN IF EXISTS inventory_id;

-- Pastikan kolom baru sudah ada (akan dibuat otomatis oleh GORM AutoMigrate)
-- item_name, quantity, supplier, description
