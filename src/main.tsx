import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CustomThemeProvider } from "./components/ThemeContext/ThemeContext";
import { SidebarProvider } from "./components/MainLayout/Sidebar/SidebarContext"; // ✅ Import the provider

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CustomThemeProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </CustomThemeProvider>
  </React.StrictMode>
);
