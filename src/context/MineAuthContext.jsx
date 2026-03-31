import { createContext, useContext } from 'react'

/**
 * Shared auth context consumed by Navbar and any other component
 * that needs to know the current mine session without prop drilling.
 *
 * Shape: { session, mineId: string, signOut: () => void }
 */
export const MineAuthContext = createContext(null)

export function useMineAuth() {
  return useContext(MineAuthContext) // returns null when outside gate (unauthenticated)
}
