-- Создание таблицы промокодов
CREATE TABLE IF NOT EXISTS promos (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Создание таблицы связей промокодов с услугами
CREATE TABLE IF NOT EXISTS promo_services (
  promo_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  PRIMARY KEY (promo_id, service_id),
  FOREIGN KEY (promo_id) REFERENCES promos (id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_promos_code ON promos (code);
CREATE INDEX IF NOT EXISTS idx_promos_is_active ON promos (is_active);
CREATE INDEX IF NOT EXISTS idx_promo_services_promo_id ON promo_services (promo_id);
CREATE INDEX IF NOT EXISTS idx_promo_services_service_id ON promo_services (service_id);