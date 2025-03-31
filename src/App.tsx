import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

import Home from './screens/home'; // ✅ Ensure this path is correct

import './index.css'; // ❌ Fix incorrect alias (@/index.css is not standard in Vite)

const paths = [
  {
    path: '/',
    element: <Home />, // ✅ Keep JSX clean
  },
];

const router = createBrowserRouter(paths); // ✅ Use lowercase variable name for router

const App = () => {
  return (
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>
  );
};

export default App;
