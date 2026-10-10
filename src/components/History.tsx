// // 📅 سجل التغذية

// اليوم
// 1,650 kcal
// 82g protein

// أمس
// 1,820 kcal
// 91g protein

// 6 أكتوبر
// 1,540 kcal
// 76g protein

import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";

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

type DayHistory = {
  dateKey: string;
  date: Date;
  calories: number;
  protein: number;
  meals: Meal[];
};

const History = () => {
  const { user } = useAuth();

  const [history, setHistory] = useState<DayHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const mealsRef = collection(
          db,
          "users",
          user.uid,
          "meals"
        );

        const snapshot = await getDocs(mealsRef);

        const meals: Meal[] = snapshot.docs.map(
          (meal) => ({
            id: meal.id,
            ...meal.data(),
          })
        ) as Meal[];

        // تجميع الوجبات حسب اليوم
        const groupedMeals: Record<
          string,
          DayHistory
        > = {};

        meals.forEach((meal) => {
          if (!meal.createdAt) return;

          const date = meal.createdAt.toDate();

          const year = date.getFullYear();
          const month = String(
            date.getMonth() + 1
          ).padStart(2, "0");
          const day = String(
            date.getDate()
          ).padStart(2, "0");

          const dateKey =
            `${year}-${month}-${day}`;

          if (!groupedMeals[dateKey]) {
            groupedMeals[dateKey] = {
              dateKey,
              date,
              calories: 0,
              protein: 0,
              meals: [],
            };
          }

          groupedMeals[dateKey].calories +=
            Number(meal.calories || 0);

          groupedMeals[dateKey].protein +=
            Number(meal.protein || 0);

          groupedMeals[dateKey].meals.push(
            meal
          );
        });

        // تحويل object إلى array وترتيب من الأحدث للأقدم
        const historyData = Object.values(
          groupedMeals
        ).sort(
          (a, b) =>
            b.date.getTime() -
            a.date.getTime()
        );

        setHistory(historyData);
      } catch (error) {
        console.error(
          "حدث خطأ أثناء جلب السجل:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(
      "ar-SY",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  const getMealTypeName = (
    type: string
  ) => {
    switch (type) {
      case "breakfast":
        return "الفطور";

      case "lunch":
        return "الغداء";

      case "dinner":
        return "العشاء";

      case "snack":
        return "سناك";

      default:
        return "وجبة";
    }
  };

  if (loading) {
    return (
      <section className="history-page">
        <div className="history-loading">
          جاري تحميل السجل...
        </div>
      </section>
    );
  }

  return (
    <section className="history-page">
      <div className="history-header">
        <div>
          <h1>سجل التغذية 📅</h1>

          <p>
            راجعي وجباتك وإنجازك الغذائي في
            الأيام السابقة.
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            📅
          </div>

          <h2>
            لا يوجد سجل بعد
          </h2>

          <p>
            عندما تضيفين وجباتك، ستظهر هنا
            تفاصيل أيامك الغذائية.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((day) => (
            <div
              className="history-day-card"
              key={day.dateKey}
            >
              <div className="history-day-header">
                <div>
                  <h2>
                    {formatDate(day.date)}
                  </h2>
                </div>

                <div className="history-summary">
                  <div>
                    <span>
                      السعرات
                    </span>

                    <strong>
                      {day.calories}
                    </strong>

                    <small>
                      kcal
                    </small>
                  </div>

                  <div>
                    <span>
                      البروتين
                    </span>

                    <strong>
                      {day.protein}
                    </strong>

                    <small>
                      g
                    </small>
                  </div>
                </div>
              </div>

              <div className="history-meals">
                {day.meals.map(
                  (meal) => (
                    <div
                      className="history-meal"
                      key={meal.id}
                    >
                      <div className="history-meal-info">
                        <h3>
                          {meal.name}
                        </h3>

                        <p>
                          {getMealTypeName(
                            meal.type
                          )}
                        </p>
                      </div>

                      <div className="history-meal-stats">
                        <span>
                          {meal.calories} kcal
                        </span>

                        <span>
                          {meal.protein}g
                          بروتين
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default History;