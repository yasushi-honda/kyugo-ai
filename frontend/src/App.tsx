import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CaseDetail } from "./pages/CaseDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
