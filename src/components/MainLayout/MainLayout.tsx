import React from "react";
import SidebarMenu from "./Sidebar/Sidebar";
import { Container, Paper } from "@mui/material";
import AppHeader from "./AppHeader/AppHeader";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div style={{ display: "flex" }}>
      <SidebarMenu />
      <Container maxWidth="xl" style={{ padding: 0, flex: 1 }}>
        <AppHeader />

        <Paper elevation={1} style={{ margin: 4, padding: 8 }}>
          {children}
        </Paper>
      </Container>
    </div>
  );
};

export default MainLayout;
