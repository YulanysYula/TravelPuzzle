
```sql
-- Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id BIGINT PRIMARY KEY, -- Using JS timestamps (Date.now())
    name TEXT NOT NULL,
    users TEXT[] DEFAULT '{}',
    progress INTEGER DEFAULT 0,
    chat JSONB DEFAULT '[]'::jsonb,
    created_by TEXT,
    share_token TEXT UNIQUE,
    trip_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow public access for trips" ON public.trips
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);
```

```env
VITE_SUPABASE_URL=ВАШ_URL
VITE_SUPABASE_ANON_KEY=ВАШ_KEY
```
