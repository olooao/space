import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Graceful degradation: if credentials are missing, create a dummy client
// that returns empty data instead of crashing the app
let supabase

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
} else {
  console.warn("[Supabase] No credentials found — running in offline mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env")

  // Stub client that won't crash callers
  const emptyResult = { data: [], error: null }
  const chainable = {
    select: () => chainable,
    order: () => chainable,
    limit: () => Promise.resolve(emptyResult),
    insert: () => Promise.resolve(emptyResult),
    eq: () => chainable,
    then: (resolve) => resolve(emptyResult),
  }

  supabase = {
    from: () => chainable,
    channel: () => ({
      on: function() { return this },
      subscribe: function() { return this },
    }),
    removeChannel: () => {},
  }
}

export { supabase }
