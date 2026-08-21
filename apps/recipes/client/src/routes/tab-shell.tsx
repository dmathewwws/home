/**
 * Layout route for the tab screens. Owns the FAB (context-aware: recipes
 * tab opens the add sheet; reflections and eating-out tabs go straight to
 * their new-entry screens) and the add sheet itself.
 */

import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AddSheet, Fab, TabBar } from '../components/Chrome'

export function TabShell() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const onReflections = location.pathname.startsWith('/reflections')
  const onEatingOut = location.pathname.startsWith('/eating-out')

  const fab = onReflections
    ? { label: 'Log a cook', onClick: () => navigate('/reflections/new') }
    : onEatingOut
      ? { label: 'Log a dish', onClick: () => navigate('/eating-out/new') }
      : { label: 'Add a recipe', onClick: () => setSheetOpen(true) }

  return (
    <>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <Outlet />
      </div>
      {!sheetOpen && <Fab label={fab.label} onClick={fab.onClick} />}
      <TabBar />
      <AddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
