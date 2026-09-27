import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { UpdateNotifier } from "./components/UpdateNotifier.jsx";
import "@fontsource-variable/inter";
import "./index.css";
import "./lib/install.js"; // start listening for the browser's "install app" offer early

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
        <UpdateNotifier />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
