import React from "react";
import SidebarMenu from "./Sidebar/Sidebar";
import { Box, Container } from "@mui/material";
import AppHeader from "./AppHeader/AppHeader";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <SidebarMenu />
      <Container
        maxWidth="xl"
        disableGutters
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          p: 0,
        }}
      >
        <AppHeader />
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            bgcolor: "background.paper",
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          {children}
        </Box>
      </Container>
    </Box>
  );
};

export default MainLayout;
