import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

type UserProfile = {
  age: string;
  height: string;
  weight: string;
  gender: string;
  activityLevel: string;
  goal: string;
};

type Meal = {
  name: string;
  type: string;
  calories: number;
  protein: number;
  createdAt?: Timestamp;
};

const Dashboard = () => {
  const { user } = useAuth();

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [meals, setMeals] =
    useState<Meal[]>([]);

  const [loading, setLoading] =
    useState(true);

  // =========================================
  // حساب السعرات اليومية المطلوبة
  // =========================================

  const calculateDailyCalories = (
    profile: UserProfile
  ) => {
    const weight = Number(profile.weight);
    const height = Number(profile.height);
    const age = Number(profile.age);

    let bmr = 0;

    // حساب BMR حسب الجنس
    if (profile.gender === "female") {
      bmr =
        10 * weight +
        6.25 * height -
        5 * age -
        161;
    } else {
      bmr =
        10 * weight +
        6.25 * height -
        5 * age +
        5;
    }

    // مستوى النشاط
    let activityMultiplier = 1.2;

    if (profile.activityLevel === "moderate") {
      activityMultiplier = 1.55;
    } else if (profile.activityLevel === "high") {
      activityMultiplier = 1.725;
    }

    // السعرات بعد حساب النشاط
    let calories =
      bmr * activityMultiplier;

    // تعديل السعرات حسب الهدف
    if (profile.goal === "lose") {
      calories -= 500;
    } else if (
      profile.goal === "gain" ||
      profile.goal === "muscle"
    ) {
      calories += 300;
    }

    return Math.round(calories);
  };

  // =========================================
  // حساب هدف البروتين اليومي
  // =========================================

  const calculateProteinTarget = (
    profile: UserProfile
  ) => {
    const weight = Number(profile.weight);

    return Math.round(weight * 1.2);
  };

  // =========================================
  // جلب بيانات المستخدم والوجبات
  // =========================================

  useEffect(() => {
    const getDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // =========================
        // جلب بيانات المستخدم
        // =========================

        const profileRef = doc(
          db,
          "users",
          user.uid
        );

        const profileSnap =
          await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile(
            profileSnap.data() as UserProfile
          );
        }

        // =========================
        // جلب الوجبات
        // =========================

        const mealsRef = collection(
          db,
          "users",
          user.uid,
          "meals"
        );

        const mealsSnapshot =
          await getDocs(mealsRef);

        // بداية اليوم
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const startOfToday =
          today.getTime();

        // نأخذ وجبات اليوم فقط
        const mealsData: Meal[] =
          mealsSnapshot.docs
            .map(
              (meal) =>
                meal.data() as Meal
            )
            .filter((meal) => {
              if (!meal.createdAt) {
                return false;
              }

              const mealDate =
                meal.createdAt
                  .toDate()
                  .getTime();

              return (
                mealDate >= startOfToday
              );
            });

        setMeals(mealsData);
      } catch (error) {
        console.error(
          "حدث خطأ أثناء جلب بيانات Dashboard:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    getDashboardData();
  }, [user]);

  // =========================================
  // حالة التحميل
  // =========================================

  if (loading) {
    return (
      <div>
        جاري تحميل بياناتك...
      </div>
    );
  }

  // =========================================
  // الحسابات اليومية
  // =========================================

  const dailyCalories = profile
    ? calculateDailyCalories(profile)
    : 0;

  const proteinTarget = profile
    ? calculateProteinTarget(profile)
    : 0;

const consumedCalories =
  meals.reduce(
    (total, meal) =>
      total + meal.calories,
    0
  );

const consumedProtein =
  meals.reduce(
    (total, meal) =>
      total +
      Number(meal.protein || 0),
    0
  );

const remainingCalories = Math.max(
  dailyCalories - consumedCalories,
  0
);

const remainingProtein = Math.max(
  proteinTarget - consumedProtein,
  0
);

  // =========================================
  // UI
  // =========================================

  return (
    <main className="dashboard">

      {/* =========================
          Header
      ========================= */}

      <header className="dashboard-header">
        <div>
          <p>
            مرحبًا{" "}
            {user?.displayName || "بك"}{" "}
            في تطبيق التغذية
          </p>

          <h1>
            جاهز نتابع تغذيتك اليوم؟
          </h1>
        </div>

        <button className="notification-btn">
          🔔
        </button>
      </header>

      {/* =========================
          Stats
      ========================= */}

      <section className="stats">

        <div className="stat-card">
          <span>الوزن</span>

          <strong>
            {profile?.weight || "--"}
          </strong>

          <small>kg</small>
        </div>

        <div className="stat-card">
          <span>الطول</span>

          <strong>
            {profile?.height || "--"}
          </strong>

          <small>cm</small>
        </div>

        <div className="stat-card">
          <span>الهدف</span>

          <strong>
            {profile?.goal === "lose"
              ? "خسارة الوزن"
              : profile?.goal === "gain"
                ? "زيادة الوزن"
                : profile?.goal === "muscle"
                  ? "بناء العضلات"
                  : "الحفاظ"}
          </strong>
        </div>

      </section>

      {/* =========================
          Calories
      ========================= */}

      <section className="dashboard-content">

        <div className="progress-card">

          <h2>
            السعرات اليوم 🔥
          </h2>

          <p>
            السعرات المستهدفة:{" "}
            <strong>
              {dailyCalories}
            </strong>{" "}
            سعرة
          </p>

          <p>
            السعرات المستهلكة:{" "}
            <strong>
              {consumedCalories}
            </strong>{" "}
            سعرة
          </p>

          <p>
            السعرات المتبقية:{" "}
            <strong>
              {remainingCalories}
            </strong>{" "}
            سعرة
          </p>

          <p>
            البروتين المستهدف:{" "}
            <strong>
              {proteinTarget}
            </strong>{" "}
            غرام
          </p>

          <p>
            البروتين المستهلك:{" "}
            <strong>
              {consumedProtein}
            </strong>{" "}
            غرام
          </p>

          <p>
  البروتين المتبقي:{" "}
  <strong>
    {remainingProtein}
  </strong>{" "}
  غرام
</p>

        </div>

        {/* =========================
            Personal Information
        ========================= */}

        <div className="progress-card">

          <h2>
            بياناتك الشخصية
          </h2>

          <p>
            العمر:{" "}
            {profile?.age || "--"}{" "}
            سنة
          </p>

          <p>
            مستوى النشاط:{" "}
            {profile?.activityLevel ===
            "low"
              ? "قليل"
              : profile?.activityLevel ===
                "moderate"
                ? "متوسط"
                : profile?.activityLevel ===
                  "high"
                  ? "مرتفع"
                  : "--"}
          </p>

        </div>

      </section>

      {/* =========================
          AI Assistant
      ========================= */}

      <section className="ai-card">

        <span>🤖</span>

        <div>
          <h2>
            مساعدك الذكي
          </h2>

          <p>
            اسألني عن وجباتك،
            السعرات، أو أي شيء
            متعلق بتغذيتك.
          </p>
        </div>

      </section>

    </main>
  );
};

export default Dashboard;