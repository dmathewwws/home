import { createBrowserRouter } from 'react-router-dom'
import { App } from '../app'
import { Today } from './today'
import { Logs } from './logs'
import { NotFound } from './not-found'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <Today /> },
        { path: 'logs', element: <Logs /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  // The app is served under /<slug>/; BASE_URL comes from `base` in vite.config.ts.
  { basename: import.meta.env.BASE_URL },
)
