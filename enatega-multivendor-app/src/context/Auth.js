import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = React.createContext()

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null)
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)

  // setTokenAsync is called when we want to forcefully save a token manually,
  // but Supabase handles persistence for us automatically. We keep the function
  // signature so old components don't immediately crash, though they should be migrated.
  const setTokenAsync = async(t) => {
    if (!t) {
      // User is logging out
      await supabase.auth.signOut()
    }
    // We let onAuthStateChange update the actual React state.
  }

  useEffect(() => {
    let isSubscribed = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isSubscribed) {
        setSession(session)
        setToken(session?.access_token || null)
        setUser(session?.user || null)
      }
    })

    // Listen to changes (login, logout, refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isSubscribed) {
        setSession(session)
        setToken(session?.access_token || null)
        setUser(session?.user || null)
      }
    })

    return () => {
      isSubscribed = false
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ token, setToken, setTokenAsync, session, user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const AuthConsumer = AuthContext.Consumer
export default AuthContext
