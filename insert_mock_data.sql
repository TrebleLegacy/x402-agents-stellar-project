-- Script para popular as tabelas wallets e contacts com dados mockados no Supabase
-- Execute este script no SQL Editor do seu dashboard Supabase

-- Inserindo Carteiras (Wallets) Mockadas
INSERT INTO public.wallets (name, public_key, session_id, user_id)
VALUES 
    ('Principal', 'GDQJUTQYXAEG464VVKQXYF3QZCRB7FW2Q54VGEZ3YVKXX3E6H5R6MOCK', 'session-demo', 'user-123'),
    ('Poupanca', 'GBZ3MOCK...XYZ', 'session-demo', 'user-123'),
    ('Carteira Business', 'GABUSINESS...XYZ', 'session-business', 'user-456');

-- Inserindo Contatos (Contacts) Mockados
INSERT INTO public.contacts (user_id, contact_name, public_key)
VALUES 
    -- Contatos do user-123
    ('user-123', 'Alice', 'GBVVRUKJYZY5O7U73B6FGB6O2ZQQ2M7T4ZYY3QW7YY...ALICE'),
    ('user-123', 'Bob', 'GDXXMOCK...BOB'),
    ('user-123', 'Loja de Conveniencia', 'GCLOJAMOCK...XYZ'),
    
    -- Contatos do user-456
    ('user-456', 'Fornecedor A', 'GDFORNECEDORMOCK...XYZ'),
    ('user-456', 'Socio Bob', 'GDXXMOCK...BOB');
