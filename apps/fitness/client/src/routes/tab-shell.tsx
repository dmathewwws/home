/**
 * Wrapper for the tab routes: scrollable content column with the mobile
 * bottom tab bar in normal flow beneath it (hidden on desktop, where
 * NavPills in each screen's TopBar take over).
 */

import { Outlet } from 'react-router-dom'
import { TabBar } from '../components/Chrome'

export function TabShell() {
  return (
    <>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <Outlet />
      </div>
      <TabBar />
    </>
  )
}
