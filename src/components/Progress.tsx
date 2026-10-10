import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

type Meal = {
  id: string;
  name: string;
  type: string;
  calories: number;
  protein: number;
  createdAt?: Timestamp;
};

type UserProfile = {
  age: string;
  height: string;
  weight: string;
  gender: string;
  activityLevel: string;
  goal: string;
};

type DayProgress = {
  dateKey: string;
  label: string;
  calories: number;
  protein: number;
  mealsCount: number;
};

const calculateDailyCalories = (
  profile: UserProfile
) => {
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);

  let bmr = 0;

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

  let activityMultiplier = 1.2;

  if (profile.activityLevel === "moderate") {
    activityMultiplier = 1.55;
  }

  if (profile.activityLevel === "high") {
    activityMultiplier = 1.725;
  }

  let calories =
    bmr * activityMultiplier;

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

const Progress = () => {
  const { user } = useAuth();

  const [progress, setProgress] = useState<
    DayProgress[]
  >([]);

  const [dailyTarget, setDailyTarget] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // =====================================
        // جلب بيانات المستخدم
        // =====================================

        const profileRef = doc(
          db,
          "users",
          user.uid
        );

        const profileSnap =
          await getDoc(profileRef);

        if (
          profileSnap.exists()
        ) {
          const profile =
            profileSnap.data() as UserProfile;

          setDailyTarget(
            calculateDailyCalories(
              profile
            )
          );
        }

        // =====================================
        // جلب الوجبات
        // =====================================

        const mealsRef = collection(
          db,
          "users",
          user.uid,
          "meals"
        );

        const mealsSnapshot =
          await getDocs(mealsRef);

        const meals: Meal[] =
          mealsSnapshot.docs.map(
            (meal) => ({
              id: meal.id,
              ...meal.data(),
            })
          ) as Meal[];

        // =====================================
        // تجميع الوجبات حسب اليوم
        // =====================================

        const grouped: Record<
          string,
          DayProgress
        > = {};

        meals.forEach((meal) => {
          if (!meal.createdAt) {
            return;
          }

          const date =
            meal.createdAt.toDate();

          const year =
            date.getFullYear();

          const month = String(
            date.getMonth() + 1
          ).padStart(2, "0");

          const day = String(
            date.getDate()
          ).padStart(2, "0");

          const dateKey =
            `${year}-${month}-${day}`;

          if (!grouped[dateKey]) {
            grouped[dateKey] = {
              dateKey,
              label:
                date.toLocaleDateString(
                  "ar-SY",
                  {
                    day: "numeric",
                    month: "short",
                  }
                ),
              calories: 0,
              protein: 0,
              mealsCount: 0,
            };
          }

          grouped[dateKey].calories +=
            Number(
              meal.calories || 0
            );

          grouped[dateKey].protein +=
            Number(
              meal.protein || 0
            );

          grouped[dateKey].mealsCount +=
            1;
        });

        // =====================================
        // ترتيب الأيام
        // =====================================

        const progressData =
          Object.values(grouped)
            .sort(
              (a, b) =>
                a.dateKey.localeCompare(
                  b.dateKey
                )
            )
            .slice(-7);

        setProgress(
          progressData
        );
      } catch (error) {
        console.error(
          "حدث خطأ أثناء تحميل التقدم:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [user]);

  // =========================================
  // حسابات سريعة
  // =========================================

  const totalDays =
    progress.length;

  const averageCalories =
    totalDays > 0
      ? Math.round(
          progress.reduce(
            (sum, day) =>
              sum + day.calories,
            0
          ) / totalDays
        )
      : 0;

  const averageProtein =
    totalDays > 0
      ? Math.round(
          progress.reduce(
            (sum, day) =>
              sum + day.protein,
            0
          ) / totalDays
        )
      : 0;

  const bestCalorieDay =
    progress.length > 0
      ? progress.reduce(
          (best, day) =>
            Math.abs(
              day.calories -
                dailyTarget
            ) <
            Math.abs(
              best.calories -
                dailyTarget
            )
              ? day
              : best
        )
      : null;

  if (loading) {
    return (
      <section className="progress-page">
        <div className="progress-empty">
          <h2>
            جاري تحميل التقدم...
          </h2>
        </div>
      </section>
    );
  }

  return (
    <section className="progress-page">
      {/* =====================================
          Header
      ===================================== */}

      <div className="progress-header">
        <h1>
          تقدمك 📊
        </h1>

        <p>
          تابعي تقدمك الغذائي خلال الأيام
          السابقة.
        </p>
      </div>

      {progress.length === 0 ? (
        <div className="progress-empty">
          <h2>
            لا توجد بيانات كافية بعد
          </h2>

          <p>
            أضيفي بعض الوجبات حتى نتمكن
            من عرض تقدمك.
          </p>
        </div>
      ) : (
        <>
          {/* =================================
              Summary
          ================================= */}

          <div className="progress-values">
            <div>
              <span>
                متوسط السعرات
              </span>

              <strong>
                {averageCalories} kcal
              </strong>
            </div>

            <div>
              <span>
                متوسط البروتين
              </span>

              <strong>
                {averageProtein} g
              </strong>
            </div>

            <div>
              <span>
                الهدف اليومي
              </span>

              <strong>
                {dailyTarget} kcal
              </strong>
            </div>

            <div>
              <span>
                أفضل يوم
              </span>

              <strong>
                {bestCalorieDay?.label ||
                  "-"}
              </strong>
            </div>
          </div>

          {/* =================================
              Calories Chart
          ================================= */}

          <div className="progress-chart-card">
            <h2>
              السعرات خلال آخر 7 أيام
            </h2>

            <p>
              مقارنة كمية السعرات التي
              تناولتها يوميًا.
            </p>

            <div className="progress-chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={progress}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="label"
                  />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="calories"
                    name="السعرات"
                    fill="#198754"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* =================================
              Daily Details
          ================================= */}

          <div className="progress-list">
            {[
              ...progress,
            ]
              .reverse()
              .map((day) => (
                <div
                  className="progress-day"
                  key={day.dateKey}
                >
                  <h3>
                    {day.label}
                  </h3>

                  <div className="progress-values">
                    <div>
                      <span>
                        السعرات
                      </span>

                      <strong>
                        {day.calories} kcal
                      </strong>
                    </div>

                    <div>
                      <span>
                        البروتين
                      </span>

                      <strong>
                        {day.protein} g
                      </strong>
                    </div>

                    <div>
                      <span>
                        عدد الوجبات
                      </span>

                      <strong>
                        {day.mealsCount}
                      </strong>
                    </div>

                    <div>
                      <span>
                        المتبقي
                      </span>

                      <strong>
                        {Math.max(
                          dailyTarget -
                            day.calories,
                          0
                        )}{" "}
                        kcal
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  );
};

export default Progress;