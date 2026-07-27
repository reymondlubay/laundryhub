import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { appConfig } from "./config/app.config";

document.title = appConfig.companyName;
import { BackendStatusProvider } from "./components/BackendStatus/BackendStatusContext";
import BackendStatusGate from "./components/BackendStatus/BackendStatusGate";
import DevEnvironmentBanner from "./components/DevEnvironmentBanner/DevEnvironmentBanner";
import { CustomThemeProvider } from "./components/ThemeContext/ThemeContext";
import { SidebarProvider } from "./components/MainLayout/Sidebar/SidebarContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CustomThemeProvider>
      <DevEnvironmentBanner />
      <BackendStatusProvider>
        <SidebarProvider>
          <BackendStatusGate>
            <App />
          </BackendStatusGate>
        </SidebarProvider>
      </BackendStatusProvider>
    </CustomThemeProvider>
  </React.StrictMode>
);
