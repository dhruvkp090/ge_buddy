import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Settings from "./components/Settings";
import Popup from "./components/Popup";

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Popup />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
