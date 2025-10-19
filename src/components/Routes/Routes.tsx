import React from "react";
import { Outlet as RouterOutlet, Navigate } from "react-router-dom";
import { type TAuthGuard } from "../../utils/routerGuard";
import MainLayout from "../MainLayout/MainLayout";
import route from "../../constants/route";

const getRenderer = (guards: TAuthGuard) => {
  if (!guards.requestDone) {
    // if guard request isn't done then render nothing and wait for requestDone to change
    return null;
  } else if (guards.failCondition) {
    // if guard request is done then check if failCondition matches
    // and if it does then either redirect to onFail or display nothing
    if (guards.onFail) {
      if (typeof guards.onFail === "string") {
        return <Navigate to={guards.onFail} />;
      } else {
        (guards as any).onFail();
        return null;
      }
    } else {
      return null;
    }
  }
  console.log(guards.onFail, route.DASHBOARD.toString());
  return guards.onFail == route.LOGIN.toString() ? (
    <MainLayout>
      <RouterOutlet />
    </MainLayout>
  ) : (
    <RouterOutlet />
  );
};

const Outlet: React.FC<{ guards: TAuthGuard }> = ({ guards }) => {
  return getRenderer(guards);
};

export default Outlet;
