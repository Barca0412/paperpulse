import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Feed from "@/pages/Feed";
import Dashboard from "@/pages/Dashboard";
import Explore, { TopicDeepDive } from "@/pages/Explore";
import NetworkPage from "@/pages/Network";
import Conferences from "@/pages/Conferences";
import Digest from "@/pages/Digest";
import Institutions from "@/pages/Institutions";
import Authors from "@/pages/Authors";
import SettingsLayout from "@/pages/settings/SettingsLayout";
import {
  SourcesTab, TopicsTab, InstitutionsTab, AuthorsTab, ScoringTab,
  FeedTab, DigestTab, LLMTab, NotificationsTab, DataTab,
  IntegrationsTab, DeploymentTab, AboutTab,
} from "@/pages/settings/tabs";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/feed" replace />} />
        <Route path="feed" element={<Feed />} />
        <Route path="explore" element={<Explore />} />
        <Route path="explore/topic/:slug" element={<TopicDeepDive />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="network" element={<NetworkPage />} />
        <Route path="conferences" element={<Conferences />} />
        <Route path="digest" element={<Digest />} />
        <Route path="institutions" element={<Institutions />} />
        <Route path="authors" element={<Authors />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="sources" replace />} />
          <Route path="sources" element={<SourcesTab />} />
          <Route path="topics" element={<TopicsTab />} />
          <Route path="institutions" element={<InstitutionsTab />} />
          <Route path="authors" element={<AuthorsTab />} />
          <Route path="scoring" element={<ScoringTab />} />
          <Route path="feed" element={<FeedTab />} />
          <Route path="digest" element={<DigestTab />} />
          <Route path="llm" element={<LLMTab />} />
          <Route path="notifications" element={<NotificationsTab />} />
          <Route path="data" element={<DataTab />} />
          <Route path="integrations" element={<IntegrationsTab />} />
          <Route path="deployment" element={<DeploymentTab />} />
          <Route path="about" element={<AboutTab />} />
        </Route>
      </Route>
    </Routes>
  );
}
