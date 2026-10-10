import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProfileSetup from "./components/ProfileSetup";
import GoogleLogin from "./GoogleLogin";

import { useAuth } from "./context/AuthContext";
import { db } from "./firebase";
 
import { Routes, Route, Navigate } from "react-router-dom"; 
import Meals from "./components/Meals";
import Progress from "./components/Progress";
import AIAssistant from "./components/AIAssistant";
import History from "./components/History";
const App = () => {
  const { user, loading: authLoading } = useAuth();

  const [profileExists, setProfileExists] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setProfileExists(false);
        setProfileLoading(false);
        return;
      }

      try {
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);

        setProfileExists(profileSnap.exists());
      } catch (error) {
        console.error("حدث خطأ أثناء جلب بيانات المستخدم:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    checkProfile();
  }, [user]);

  if (authLoading || profileLoading) {
    return <div>جاري التحميل...</div>;
  }

  if (!user) {
    return <GoogleLogin />;
  }

  if (!profileExists) {
    return (
      <ProfileSetup
        onProfileCreated={() => setProfileExists(true)}
      />
    );
  }

return (
  <>
    <Sidebar />

    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/meals" element={<Meals />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/assistant" element={<AIAssistant />} />
      <Route path="/history" element={<History />} />
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  </>
);
};

export default App;