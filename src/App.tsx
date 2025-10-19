import { authGuard, unAuthGuard } from "./utils/routerGuard";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Outlet from "./components/Routes/Routes";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Transaction from "./pages/Transaction/Transaction";
import route from "./constants/route";
import { storage, storageKey } from "./utils/storage";

function App() {
  //storage.removeToken(storageKey.TOKEN);
  storage.setToken("11111", storageKey.TOKEN);
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path={route.ROOT} element={<Outlet guards={unAuthGuard} />}>
            <Route index element={<Login />} />
            <Route path={route.LOGIN} element={<Login />} />
          </Route>
          <Route path={route.ROOT} element={<Outlet guards={authGuard} />}>
            <Route path={route.DASHBOARD} element={<Dashboard />} />
            <Route path={route.TRANSACTION} element={<Transaction />} />
          </Route>

          <Route path="*" element={<div>Wala</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
