import { BrowserRouter as Router, useRoutes } from "react-router-dom";
import { appRoutes } from "./config/routes.config";

function AppRoutes() {
  return useRoutes(appRoutes);
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;
