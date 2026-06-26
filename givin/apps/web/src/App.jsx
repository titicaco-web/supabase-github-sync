import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/useAuth";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Send from "./pages/Send.jsx";
import Redeem from "./pages/Redeem.jsx";

export default function App() {
  const auth = useAuth();

  return (
    <Routes>
      {/* Public redeem page — no login needed to receive a gift. */}
      <Route path="/redeem/:token" element={<Redeem />} />

      <Route
        path="/"
        element={auth.user ? <Navigate to="/app" replace /> : <Login auth={auth} />}
      />

      <Route
        path="/app"
        element={
          auth.loading ? <Splash /> : auth.user ? <Dashboard auth={auth} /> : <Navigate to="/" replace />
        }
      />
      <Route
        path="/send"
        element={
          auth.loading ? <Splash /> : auth.user ? <Send auth={auth} /> : <Login auth={auth} />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Splash() {
  return <div className="wrap section center muted">Loading…</div>;
}
