import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

const GoogleLogin = () => {
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      console.log("تم تسجيل الدخول:", result.user);
    } catch (error) {
      console.error("حدث خطأ أثناء تسجيل الدخول:", error);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo">🥗</div>

        <h1>Nutrition AI</h1>

        <p className="login-subtitle">
          مساعدك الذكي نحو تغذية أفضل
        </p>

        <div className="login-welcome">
          <h2>أهلاً بك 👋</h2>
          <p>
            سجّل دخولك لنبدأ رحلة تغذية أكثر ذكاءً.
          </p>
        </div>

        <button className="google-login-btn" onClick={handleGoogleLogin}>
          <span className="google-icon">G</span>
          <span>المتابعة باستخدام Google</span>
        </button>

        <p className="login-footer">
          ابدأ الآن وتابع تغذيتك بطريقة أذكى 🥗
        </p>
      </div>
    </main>
  );
};

export default GoogleLogin;