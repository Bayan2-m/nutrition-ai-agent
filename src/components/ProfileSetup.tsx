import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

type ProfileSetupProps = {
  onProfileCreated: () => void;
};

const ProfileSetup = ({ onProfileCreated }: ProfileSetupProps) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    age: "",
    height: "",
    weight: "",
    gender: "",
    activityLevel: "",
    goal: "",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      setSaving(true);

      await setDoc(doc(db, "users", user.uid), {
        ...formData,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date(),
      });

      
      console.log("تم حفظ البيانات بنجاح ✅");
      onProfileCreated();
    } catch (error) {
      console.error("حدث خطأ أثناء حفظ البيانات:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="profile-setup-page">
      <div className="profile-setup-card">
        <div className="profile-setup-icon">🥗</div>

        <h1>خلينا نتعرف عليك</h1>

        <p className="profile-setup-subtitle">
          بعض المعلومات البسيطة تساعدنا نقدم لك تجربة تغذية مناسبة لك.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>العمر</label>

              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="مثال: 22"
                min="1"
                max="120"
                required
              />
            </div>

            <div className="form-group">
              <label>الجنس</label>

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">اختيار</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>الطول (سم)</label>

              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="مثال: 170"
                min="50"
                max="250"
                required
              />
            </div>

            <div className="form-group">
              <label>الوزن (كغ)</label>

              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="مثال: 65"
                min="20"
                max="300"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>مستوى النشاط</label>

            <select
              name="activityLevel"
              value={formData.activityLevel}
              onChange={handleChange}
              required
            >
              <option value="">اختيار مستوى النشاط</option>
              <option value="low">قليل</option>
              <option value="moderate">متوسط</option>
              <option value="high">مرتفع</option>
            </select>
          </div>

          <div className="form-group">
            <label>هدفك</label>

            <select
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              required
            >
              <option value="">اختيار الهدف</option>
              <option value="lose">خسارة الوزن</option>
              <option value="maintain">الحفاظ على الوزن</option>
              <option value="gain">زيادة الوزن</option>
              <option value="muscle">بناء العضلات</option>
            </select>
          </div>

          <button type="submit" className="profile-submit-btn">
            {saving ? "جاري الحفظ..." : "متابعة"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default ProfileSetup;