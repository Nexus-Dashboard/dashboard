// routes/Routers.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "../page/Dashboard";
import Upload from "../page/upload";

const Routers = () => (
  <Routes>
    <Route path="/upload" element={<Upload />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="*" element={<Dashboard />} />
  </Routes>
);

export default Routers;