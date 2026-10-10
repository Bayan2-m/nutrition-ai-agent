import {
  FiGrid,
  FiCoffee,
  FiBarChart2,
  FiMessageCircle,
  FiSettings,
  FiLogOut,
  FiCalendar
} from "react-icons/fi";

import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("حدث خطأ أثناء تسجيل الخروج:", error);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🥗</div>

        <div>
          <h2>Nutrition AI</h2>
          <span>Smart Nutrition</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-title">القائمة الرئيسية</p>

        <button
          className="nav-item active"
          onClick={() => navigate("/dashboard")}
        >
          <FiGrid />
          <span>لوحة التحكم</span>
        </button>

        <button className="nav-item" onClick={() => navigate("/meals")}>
          <FiCoffee />
          <span>وجباتي</span>
        </button>

        <button className="nav-item" onClick={() => navigate("/progress")}>
          <FiBarChart2 />
          <span>تقدمي</span>
        </button>

        <button className="nav-item" onClick={() => navigate("/history")}>
          <FiCalendar />
          <span>السجل الغذائي</span>
        </button>

        <button
          className="nav-item"
          onClick={() => navigate("/assistant")}
        >
          <FiMessageCircle />
          <span>المساعد الذكي</span>
</button>
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item">
          <FiSettings />
          <span>الإعدادات</span>
        </button>

        <div className="profile">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="profile-avatar" />
          ) : (
            <div className="profile-avatar">
              {user?.displayName?.charAt(0) || "U"}
            </div>
          )}

          <div className="profile-info">
            <strong>{user?.displayName || "المستخدم"}</strong>
            <span>{user?.email || "حسابي"}</span>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <FiLogOut />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
