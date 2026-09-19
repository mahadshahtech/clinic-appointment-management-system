import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import "./styles/global.css";

document.documentElement.dataset.theme = "clinic";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

import("react-dom/client").then(({ createRoot }) => {
  createRoot(rootElement).render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
});
