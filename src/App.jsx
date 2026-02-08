import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Rules from "./pages/Rules.jsx";
import Users from "./pages/Users.jsx";
import Broadcast from "./pages/Broadcast.jsx";
import Console from "./pages/Console.jsx";
import Logs from "./pages/Logs.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/users" element={<Users />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/console" element={<Console />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
