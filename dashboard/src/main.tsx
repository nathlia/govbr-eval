import React from "react";
import { createRoot } from "react-dom/client";
import ResultsPage from "./ResultsPage";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ResultsPage />
  </React.StrictMode>
);
