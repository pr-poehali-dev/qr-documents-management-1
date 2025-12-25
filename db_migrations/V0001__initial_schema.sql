-- Создание таблиц для системы QR-документов

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

-- Таблица товаров
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_number VARCHAR(12) NOT NULL UNIQUE,
    client_id UUID REFERENCES users(id),
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(255),
    item_description TEXT NOT NULL,
    department VARCHAR(50) NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL,
    return_amount DECIMAL(10, 2) NOT NULL,
    deposit_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'stored',
    returned_date TIMESTAMP,
    discount DECIMAL(5, 2),
    bonus_card VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица SMS уведомлений
CREATE TABLE IF NOT EXISTS sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    item_id UUID REFERENCES items(id),
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Таблица блокировок входа
CREATE TABLE IF NOT EXISTS login_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lockout_type VARCHAR(50) NOT NULL,
    locked_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_items_qr_number ON items(qr_number);
CREATE INDEX IF NOT EXISTS idx_items_client_phone ON items(client_phone);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Создаём первого супер-администратора (Никитовский)
INSERT INTO users (name, role, is_active) 
VALUES ('Никитовский', 'nikitovsky', true) 
ON CONFLICT (name) DO NOTHING;