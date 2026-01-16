import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TrashPage from './pages/TrashPage';
import SkillDetail from './components/skills/SkillDetail';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/skill/:id" element={<SkillDetailPage />} />
        <Route path="/trash" element={<TrashPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function SkillDetailPage() {
  return (
    <div className="detail-page">
      <div className="detail-wrapper">
        <SkillDetail />
      </div>
    </div>
  );
}

export default App;
