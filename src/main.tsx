import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { usingMock } from './api';
import Activity from './pages/Activity';
import Concern from './pages/Concern';
import Control from './pages/Control';
import Crisis from './pages/Crisis';
import Home from './pages/Home';
import Path from './pages/Path';
import PickCards from './pages/PickCards';
import Reflect from './pages/Reflect';
import { MyPage, ReflectionDetail, Reminders } from './pages/records';
import Result from './pages/Result';
import Situation from './pages/Situation';
import Sort from './pages/Sort';
import './styles.css';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/situation" element={<Situation />} />
        <Route path="/s/concern" element={<Concern />} />
        <Route path="/s/pick-guess" element={<PickCards key="guess" mode="guess" />} />
        <Route path="/s/pick-fact" element={<PickCards key="fact" mode="fact" />} />
        <Route path="/s/sort" element={<Sort />} />
        <Route path="/s/control" element={<Control />} />
        <Route path="/s/path" element={<Path />} />
        <Route path="/s/activity" element={<Activity />} />
        <Route path="/s/reflect" element={<Reflect />} />
        <Route path="/s/result" element={<Result />} />
        <Route path="/crisis" element={<Crisis />} />
        <Route path="/me" element={<MyPage />} />
        <Route path="/me/:reflectionId" element={<ReflectionDetail />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {usingMock && <span className="mock-flag">가짜 API</span>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
