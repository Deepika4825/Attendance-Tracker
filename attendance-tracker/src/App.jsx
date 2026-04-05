import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import MarkAttendance from './pages/MarkAttendance'
import ForgotPassword from './pages/ForgotPassword'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* Public QR scan page — accessible without login, but login required to submit */}
      <Route path="/mark-attendance" element={<MarkAttendance />} />
      <Route path="/student-dashboard" element={
        <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
      } />
      <Route path="/teacher-dashboard" element={
        <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
