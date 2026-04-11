-- Execute este script no SQL Editor do seu dashboard Supabase
-- Ele criará as tabelas faltantes necessárias para o backend rodar sem os erros de "Could not find the table".

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    public_key TEXT NOT NULL,
    session_id TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de segurança (opcionais, mas boas práticas se forem públicas ou usadas no front-end)
-- Descomente se RLS estiver ativo no Supabase
/*
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura anonima" ON public.wallets FOR SELECT USING (true);
CREATE POLICY "Permitir inserção anonima" ON public.wallets FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura anonima" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Permitir inserção anonima" ON public.contacts FOR INSERT WITH CHECK (true);
*/
