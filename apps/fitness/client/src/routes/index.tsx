import { createBrowserRouter } from 'react-router-dom'
import { App } from '../app'
import { AppShell } from './app-shell'
import { TabShell } from './tab-shell'
import { Activities } from './activities'
import { Weight } from './weight'
import { NotFound } from './not-found'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              element: <TabShell />,
              children: [
                { index: true, element: <Activities /> },
                { path: 'weight', element: <Weight /> },
              ],
            },
            { path: '*', element: <NotFound /> },
          ],
        },
      ],
    },
  ],
  // The app is served under /<slug>/; BASE_URL comes from `base` in vite.config.ts.
  { basename: import.meta.env.BASE_URL },
)
