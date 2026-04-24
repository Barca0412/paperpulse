import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Feed from "@/pages/Feed";
import Explore from "@/pages/Explore";
import Dashboard from "@/pages/Dashboard";
import Network from "@/pages/Network";
import Conferences from "@/pages/Conferences";
import Digest from "@/pages/Digest";
import Institutions from "@/pages/Institutions";
import Authors from "@/pages/Authors";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/feed" replace />} />
        <Route path="feed" element={<Feed />} />
        <Route path="explore" element={<Explore />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="network" element={<Network />} />
        <Route path="conferences" element={<Conferences />} />
        <Route path="digest" element={<Digest />} />
        <Route path="institutions" element={<Institutions />} />
        <Route path="authors" element={<Authors />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
