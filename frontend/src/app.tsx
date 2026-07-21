import { Router, route } from "preact-router";
import { useEffect } from "preact/hooks";
import Viz from "./pages/Viz";
import Welcome from "./pages/Welcome";
import ConversationalLLM from "./pages/conversational_llm";
import Library from "./pages/Library";
import ExcelViewer from "./pages/ExcelViewer";
import Navbar from "./components/navbar";
import SystemDataManagement from "./pages/SystemDataManagement";
import { SiteProvider, useSite } from "./components/SiteContext";
import './app.css'

/** Redirect to "/" if no site is selected and user tries to access a protected page */
function RouteGuard({ path: _path, url }: { path?: string; url?: string }) {
  const { site } = useSite();
  useEffect(() => {
    if (!site && url && url !== '/') {
      route('/', true);
    }
  }, [site, url]);
  return null;
}

function AppInner() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <Navbar />
      <Router>
        <RouteGuard path="/:rest*" />
        <Welcome path="/" />
        <SystemDataManagement path="/management" />
        <Viz path="/viz" />
        <ConversationalLLM path="/conversational_llm" />
        <Library path="/library" />
        <ExcelViewer path="/excel-viewer" />
      </Router>
    </div>
  );
}

function App() {
  return (
    <SiteProvider>
      <AppInner />
    </SiteProvider>
  );
}

export default App;
