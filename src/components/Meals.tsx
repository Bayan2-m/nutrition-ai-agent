import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import {
  FiPlus,
  FiCoffee,
  FiSun,
  FiMoon,
  FiX,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

type Meal = {
  id?: string;
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

const calculateDailyCalories = (profile: UserProfile) => {
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);

  let bmr = 0;

  if (profile.gender === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }

  let activityMultiplier = 1.2;

  if (profile.activityLevel === "moderate") {
    activityMultiplier = 1.55;
  }

  if (profile.activityLevel === "high") {
    activityMultiplier = 1.725;
  }

  let calories = bmr * activityMultiplier;

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

const calculateProteinTarget = (profile: UserProfile) => {
  const weight = Number(profile.weight);

  return Math.round(weight * 1.2);
};

const Meals = () => {
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // الوجبة التي نقوم بتعديلها حاليًا
  const [editingMealId, setEditingMealId] = useState<string | null>(
    null
  );

  // بيانات نصيحة الـ AI
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // جميع الوجبات
  const [meals, setMeals] = useState<Meal[]>([]);

  // بيانات الفورم
  const [mealData, setMealData] = useState<Meal>({
    name: "",
    type: "",
    calories: 0,
    protein: 0,
  });

  // =========================================
  // جلب الوجبات من Firestore
  // =========================================

  useEffect(() => {
    const getMeals = async () => {
      if (!user) return;

      try {
        const mealsRef = collection(
          db,
          "users",
          user.uid,
          "meals"
        );

        const mealsSnapshot = await getDocs(mealsRef);

        const mealsData: Meal[] = mealsSnapshot.docs.map(
          (meal) => ({
            id: meal.id,
            ...meal.data(),
          })
        ) as Meal[];

        setMeals(mealsData);
      } catch (error) {
        console.error(
          "حدث خطأ أثناء جلب الوجبات:",
          error
        );
      }
    };

    getMeals();
  }, [user]);

  // =========================================
  // تغيير بيانات الفورم
  // =========================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setMealData((prev) => ({
      ...prev,
      [name]:
        name === "calories" || name === "protein"
          ? Number(value)
          : value,
    }));
  };

  // =========================================
  // الحصول على نصيحة من AI
  // =========================================

  const getAIAdvice = async (savedMeal: Meal) => {
    if (!user) return;

    try {
      setAiLoading(true);
      setAiAdvice("");

      // جلب بيانات المستخدم
      const profileRef = doc(
        db,
        "users",
        user.uid
      );

      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        throw new Error(
          "لم يتم العثور على بيانات المستخدم"
        );
      }

      const profile =
        profileSnap.data() as UserProfile;

      // جلب الوجبات
      const mealsRef = collection(
        db,
        "users",
        user.uid,
        "meals"
      );

      const mealsSnapshot = await getDocs(mealsRef);

      const allMeals = mealsSnapshot.docs.map(
        (meal) => ({
          id: meal.id,
          ...meal.data(),
        })
      ) as Meal[];

      // تاريخ اليوم
      const today = new Date();

      // وجبات اليوم فقط
      const todayMeals = allMeals.filter(
        (meal) => {
          if (!meal.createdAt) return false;

          const mealDate =
            meal.createdAt.toDate();

          return (
            mealDate.getFullYear() ===
              today.getFullYear() &&
            mealDate.getMonth() ===
              today.getMonth() &&
            mealDate.getDate() ===
              today.getDate()
          );
        }
      );

      // السعرات اليومية
      const dailyCalories =
        calculateDailyCalories(profile);

      // هدف البروتين
      const proteinTarget =
        calculateProteinTarget(profile);

      // السعرات المستهلكة
      const consumedCalories =
        todayMeals.reduce(
          (total, meal) =>
            total +
            Number(meal.calories || 0),
          0
        );

      // البروتين المستهلك
      const consumedProtein =
        todayMeals.reduce(
          (total, meal) =>
            total +
            Number(meal.protein || 0),
          0
        );

      // السعرات المتبقية
      const remainingCalories =
        Math.max(
          dailyCalories -
            consumedCalories,
          0
        );

      // البروتين المتبقي
      const remainingProtein =
        Math.max(
          proteinTarget -
            consumedProtein,
          0
        );

// إرسال البيانات للـ AI
const response = await fetch(
`${import.meta.env.VITE_API_URL}/api/chat`,
{
method: "POST",


headers: {
  "Content-Type": "application/json",
},

body: JSON.stringify({
  message: `


لقد أضفت هذه الوجبة الآن:

اسم الوجبة: ${savedMeal.name}
نوع الوجبة: ${savedMeal.type}
السعرات: ${savedMeal.calories} kcal
البروتين: ${savedMeal.protein} g

أريد منك تقييم هذه الوجبة بناءً على هدفي ووضعي الغذائي اليوم.

أعطني نصيحة قصيرة وعملية.
وضح لي إذا كانت الوجبة مناسبة لهدفي.
ولا تفترض أن كل السعرات أو البروتين المتبقي يجب تناوله في هذه الوجبة.
`,
userProfile: profile,
meals: todayMeals,


  nutritionSummary: {
    dailyCalories,
    consumedCalories,
    consumedProtein,
    remainingCalories,
    proteinTarget,
    remainingProtein,
  },
}),


}
);

if (!response.ok) {
throw new Error("حدث خطأ في الاتصال بالـ AI");
}


      const data =
        await response.json();

      setAiAdvice(
        data.answer ||
          "لم يصل رد من الـ AI."
      );
    } catch (error) {
      console.error(
        "AI Advice Error:",
        error
      );

      setAiAdvice(
        "تعذر الحصول على نصيحة من المساعد الذكي."
      );
    } finally {
      setAiLoading(false);
    }
  };

  // =========================================
  // بدء تعديل وجبة
  // =========================================

  const handleEditMeal = (
    meal: Meal
  ) => {
    setMealData({
      name: meal.name,
      type: meal.type,
      calories: meal.calories,
      protein: meal.protein,
    });

    setEditingMealId(
      meal.id || null
    );

    setShowForm(true);
  };

  // =========================================
  // حذف وجبة
  // =========================================

  const handleDeleteMeal = async (
    mealId?: string
  ) => {
    if (!user || !mealId) return;

    const confirmed =
      window.confirm(
        "هل أنتِ متأكدة من حذف هذه الوجبة؟"
      );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "meals",
          mealId
        )
      );

      setMeals((prev) =>
        prev.filter(
          (meal) =>
            meal.id !== mealId
        )
      );

      console.log(
        "تم حذف الوجبة ✅"
      );
    } catch (error) {
      console.error(
        "حدث خطأ أثناء حذف الوجبة:",
        error
      );
    }
  };

  // =========================================
  // حفظ أو تعديل الوجبة
  // =========================================

  const handleSaveMeal = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user) return;

    try {
      setSaving(true);

      // =====================================
      // تعديل
      // =====================================

      if (editingMealId) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "meals",
            editingMealId
          ),
          {
            name: mealData.name,
            type: mealData.type,
            calories:
              mealData.calories,
            protein:
              mealData.protein,
          }
        );

        // تحديث القائمة مباشرة
        setMeals((prev) =>
          prev.map((meal) =>
            meal.id ===
            editingMealId
              ? {
                  ...meal,
                  ...mealData,
                }
              : meal
          )
        );

        console.log(
          "تم تعديل الوجبة ✅"
        );
      }

      // =====================================
      // إضافة جديدة
      // =====================================

      else {
        const mealRef =
          await addDoc(
            collection(
              db,
              "users",
              user.uid,
              "meals"
            ),
            {
              name: mealData.name,
              type: mealData.type,
              calories:
                mealData.calories,
              protein:
                mealData.protein,
              createdAt:
                serverTimestamp(),
            }
          );

        const savedMeal = {
          ...mealData,
          id: mealRef.id,
        };

        // إضافة للقائمة مباشرة
        setMeals((prev) => [
          ...prev,
          savedMeal,
        ]);

        // إرسال الوجبة للـ AI
        await getAIAdvice(
          savedMeal
        );

        console.log(
          "تم حفظ الوجبة ✅"
        );
      }

      // إعادة ضبط الفورم
      setMealData({
        name: "",
        type: "",
        calories: 0,
        protein: 0,
      });

      setEditingMealId(null);
      setShowForm(false);
    } catch (error) {
      console.error(
        "حدث خطأ أثناء حفظ الوجبة:",
        error
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // فتح فورم إضافة وجبة
  // =========================================

  const openMealForm = (
    type: string
  ) => {
    setMealData((prev) => ({
      ...prev,
      type,
    }));

    setEditingMealId(null);
    setShowForm(true);
  };

  // =========================================
  // إغلاق الفورم
  // =========================================

  const closeMealForm = () => {
    setMealData({
      name: "",
      type: "",
      calories: 0,
      protein: 0,
    });

    setEditingMealId(null);
    setShowForm(false);
  };

  // =========================================
  // الحصول على وجبة حسب النوع
  // =========================================
const getMealsByType = (type: string) => {
  return meals.filter(
    (meal) => meal.type === type
  );
};

  return (
    <section className="meals-section">
      {/* =====================================
          Header
      ===================================== */}

      <div className="meals-header">
        <div>
          <h2>
            وجبات اليوم 🍽️
          </h2>

          <p>
            تابعي وجباتك وسجلي ما
            تناولته اليوم.
          </p>
        </div>

        <button
          type="button"
          className="add-meal-btn"
          onClick={() =>
            openMealForm("")
          }
        >
          <FiPlus />
          إضافة وجبة
        </button>
      </div>

      {/* =====================================
          Form
      ===================================== */}

      {showForm && (
        <form
          className="meal-form-card"
          onSubmit={handleSaveMeal}
        >
          <div className="meal-form-header">
            <h3>
              {editingMealId
                ? "تعديل الوجبة ✏️"
                : "إضافة وجبة 🍽️"}
            </h3>

            <button
              type="button"
              className="close-form-btn"
              onClick={
                closeMealForm
              }
            >
              <FiX />
            </button>
          </div>

          <div className="form-group">
            <label>
              اسم الوجبة
            </label>

            <input
              type="text"
              name="name"
              value={mealData.name}
              onChange={
                handleChange
              }
              placeholder="مثال: بيض مع خبز وخضار"
              required
            />
          </div>

          <div className="form-group">
            <label>
              نوع الوجبة
            </label>

            <select
              name="type"
              value={mealData.type}
              onChange={
                handleChange
              }
              required
            >
              <option value="">
                اختيار النوع
              </option>

              <option value="breakfast">
                الفطور
              </option>

              <option value="lunch">
                الغداء
              </option>

              <option value="dinner">
                العشاء
              </option>

              <option value="snack">
                سناك
              </option>
            </select>
          </div>

          <div className="meal-form-row">
            <div className="form-group">
              <label>
                السعرات
              </label>

              <input
                type="number"
                name="calories"
                value={
                  mealData.calories ||
                  ""
                }
                onChange={
                  handleChange
                }
                placeholder="مثال: 450"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>
                البروتين (g)
              </label>

              <input
                type="number"
                name="protein"
                value={
                  mealData.protein ||
                  ""
                }
                onChange={
                  handleChange
                }
                placeholder="مثال: 25"
                min="0"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="save-meal-btn"
            disabled={saving}
          >
            {saving
              ? "جاري الحفظ..."
              : editingMealId
                ? "حفظ التعديل"
                : "حفظ الوجبة"}
          </button>
        </form>
      )}

      {/* =====================================
          Meals List
      ===================================== */}


<div className="meals-list">

  {/* الفطور */}
  <div className="meal-card">
    <div className="meal-icon breakfast">
      <FiCoffee />
    </div>

    <div className="meal-info">
      <h3>الفطور</h3>

      {getMealsByType("breakfast").length > 0 ? (
        getMealsByType("breakfast").map((meal) => (
          <div className="meal-entry" key={meal.id}>
            <div className="meal-entry-info">
              <p>{meal.name}</p>

              <small>
                {meal.calories} سعرة •{" "}
                {meal.protein}g بروتين
              </small>
            </div>

            <div className="meal-actions">
              <button
                type="button"
                className="meal-action edit"
                onClick={() =>
                  handleEditMeal(meal)
                }
                title="تعديل"
              >
                <FiEdit2 />
              </button>

              <button
                type="button"
                className="meal-action delete"
                onClick={() =>
                  handleDeleteMeal(meal.id)
                }
                title="حذف"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>لم تتم إضافة وجبة بعد</p>
      )}
    </div>

    <button
      type="button"
      className="meal-add-btn"
      onClick={() =>
        openMealForm("breakfast")
      }
    >
      <FiPlus />
    </button>
  </div>


  {/* الغداء */}
  <div className="meal-card">
    <div className="meal-icon lunch">
      <FiSun />
    </div>

    <div className="meal-info">
      <h3>الغداء</h3>

      {getMealsByType("lunch").length > 0 ? (
        getMealsByType("lunch").map((meal) => (
          <div className="meal-entry" key={meal.id}>
            <div className="meal-entry-info">
              <p>{meal.name}</p>

              <small>
                {meal.calories} سعرة •{" "}
                {meal.protein}g بروتين
              </small>
            </div>

            <div className="meal-actions">
              <button
                type="button"
                className="meal-action edit"
                onClick={() =>
                  handleEditMeal(meal)
                }
                title="تعديل"
              >
                <FiEdit2 />
              </button>

              <button
                type="button"
                className="meal-action delete"
                onClick={() =>
                  handleDeleteMeal(meal.id)
                }
                title="حذف"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>لم تتم إضافة وجبة بعد</p>
      )}
    </div>

    <button
      type="button"
      className="meal-add-btn"
      onClick={() =>
        openMealForm("lunch")
      }
    >
      <FiPlus />
    </button>
  </div>


  {/* العشاء */}
  <div className="meal-card">
    <div className="meal-icon dinner">
      <FiMoon />
    </div>

    <div className="meal-info">
      <h3>العشاء</h3>

      {getMealsByType("dinner").length > 0 ? (
        getMealsByType("dinner").map((meal) => (
          <div className="meal-entry" key={meal.id}>
            <div className="meal-entry-info">
              <p>{meal.name}</p>

              <small>
                {meal.calories} سعرة •{" "}
                {meal.protein}g بروتين
              </small>
            </div>

            <div className="meal-actions">
              <button
                type="button"
                className="meal-action edit"
                onClick={() =>
                  handleEditMeal(meal)
                }
                title="تعديل"
              >
                <FiEdit2 />
              </button>

              <button
                type="button"
                className="meal-action delete"
                onClick={() =>
                  handleDeleteMeal(meal.id)
                }
                title="حذف"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>لم تتم إضافة وجبة بعد</p>
      )}
    </div>

    <button
      type="button"
      className="meal-add-btn"
      onClick={() =>
        openMealForm("dinner")
      }
    >
      <FiPlus />
    </button>
  </div>


  {/* السناك */}
  <div className="meal-card">
    <div className="meal-icon snack">
      🍎
    </div>

    <div className="meal-info">
      <h3>سناك</h3>

      {getMealsByType("snack").length > 0 ? (
        getMealsByType("snack").map((meal) => (
          <div className="meal-entry" key={meal.id}>
            <div className="meal-entry-info">
              <p>{meal.name}</p>

              <small>
                {meal.calories} سعرة •{" "}
                {meal.protein}g بروتين
              </small>
            </div>

            <div className="meal-actions">
              <button
                type="button"
                className="meal-action edit"
                onClick={() =>
                  handleEditMeal(meal)
                }
                title="تعديل"
              >
                <FiEdit2 />
              </button>

              <button
                type="button"
                className="meal-action delete"
                onClick={() =>
                  handleDeleteMeal(meal.id)
                }
                title="حذف"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>لم تتم إضافة وجبة بعد</p>
      )}
    </div>

    <button
      type="button"
      className="meal-add-btn"
      onClick={() =>
        openMealForm("snack")
      }
    >
      <FiPlus />
    </button>
  </div>

</div>




      {/* =====================================

          AI Advice
      ===================================== */}

      {(aiLoading || aiAdvice) && (
        <div className="ai-meal-advice">
          <h3>
            🤖 نصيحة المساعد الذكي
          </h3>

          {aiLoading ? (
            <p>
              جاري تحليل الوجبة...
              🤔
            </p>
          ) : (
            <p>
              {aiAdvice}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default Meals;