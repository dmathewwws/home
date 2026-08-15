import { createBrowserRouter } from 'react-router-dom'
import { App } from '../app'
import { PhoneFrame } from './phone-frame'
import { TabShell } from './tab-shell'
import { RecipeList } from './recipe-list'
import { RecipeDetail } from './recipe-detail'
import { ReflectionsList } from './reflections-list'
import { PasteLink } from './paste-link'
import { ImportReview } from './import-review'
import { ManualEntry } from './manual-entry'
import { NewReflection } from './new-reflection'
import { NotFound } from './not-found'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        {
          element: <PhoneFrame />,
          children: [
            {
              element: <TabShell />,
              children: [
                { index: true, element: <RecipeList /> },
                { path: 'reflections', element: <ReflectionsList /> },
              ],
            },
            { path: 'recipe/:id', element: <RecipeDetail /> },
            { path: 'add/paste', element: <PasteLink /> },
            { path: 'add/review', element: <ImportReview /> },
            { path: 'add/manual', element: <ManualEntry /> },
            { path: 'reflections/new', element: <NewReflection /> },
            { path: '*', element: <NotFound /> },
          ],
        },
      ],
    },
  ],
  // The app is served under /<slug>/; BASE_URL comes from `base` in vite.config.ts.
  { basename: import.meta.env.BASE_URL },
)
