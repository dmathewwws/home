/**
 * Layout route for the two tab screens. Owns the FAB (context-aware: recipes
 * tab opens the add sheet; reflections tab goes straight to a new
 * reflection) and the add sheet itself.
 */

import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AddSheet, Fab, TabBar } from '../components/Chrome'

export function TabShell() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const onReflections = location.pathname.startsWith('/reflections')

  return (
    <>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <Outlet />
      </div>
      {!sheetOpen && (
        <Fab
          label={onReflections ? 'Log a cook' : 'Add a recipe'}
          onClick={() => (onReflections ? navigate('/reflections/new') : setSheetOpen(true))}
        />
      )}
      <TabBar />
      <AddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
