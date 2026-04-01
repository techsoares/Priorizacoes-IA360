-- Tabela de perfis: registra todos os usuários que fizeram login
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de admins: emails com acesso à área administrativa
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin inicial
INSERT INTO admins (email) VALUES ('andressa.soares@pgmais.com.br') ON CONFLICT DO NOTHING;

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- RLS para admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read admins"
  ON admins FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert admins"
  ON admins FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Admins can delete admins"
  ON admins FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')));
