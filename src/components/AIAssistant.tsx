import { useState } from "react";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";

import {
  FiSend,
  FiMessageCircle,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

type Message = {
  id: number;
  text: string;
  sender: "user" | "ai";
};

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

const AIAssistant = () => {
  const { user } = useAuth();

  // الرسالة الموجودة داخل input
  const [message, setMessage] = useState("");

  // تاريخ المحادثة
  const [messages, setMessages] = useState<Message[]>([]);

  // حالة تحميل AI
  const [loading, setLoading] = useState(false);

  // =========================================
  // حساب السعرات اليومية
  // =========================================

  const calculateDailyCalories = (
    profile: UserProfile
  ) => {
    const weight = Number(profile.weight);
    const height = Number(profile.height);
    const age = Number(profile.age);

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
    } else if (
      profile.activityLevel === "high"
    ) {
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

  // =========================================
  // حساب هدف البروتين
  // =========================================

  const calculateProteinTarget = (
    profile: UserProfile
  ) => {
    const weight = Number(profile.weight);

    return Math.round(weight * 1.2);
  };

  // =========================================
  // إرسال الرسالة
  // =========================================

  const handleSend = async (
    quickMessage?: string
  ) => {
    // لازم يكون في مستخدم
    if (!user) return;

    // إذا كانت الرسالة قادمة من زر سريع
    // نستخدمها
    //
    // وإذا لم تكن موجودة نستخدم
    // النص المكتوب داخل input
    const messageToSend =
      quickMessage ?? message;

    if (!messageToSend.trim()) {
      return;
    }

    const userText =
      messageToSend.trim();

    // إضافة سؤال المستخدم للمحادثة
    const userMessage: Message = {
      id: Date.now(),
      text: userText,
      sender: "user",
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    // تنظيف input
    setMessage("");

    // تشغيل loading
    setLoading(true);

    try {
      // =====================================
      // 1. جلب بيانات المستخدم
      // =====================================

      const profileRef = doc(
        db,
        "users",
        user.uid
      );

      const profileSnap =
        await getDoc(profileRef);

      let profile:
        | UserProfile
        | null = null;

      if (profileSnap.exists()) {
        profile =
          profileSnap.data() as UserProfile;
      }

      if (!profile) {
        throw new Error(
          "لم يتم العثور على بيانات المستخدم"
        );
      }

      // =====================================
      // 2. حساب السعرات والبروتين
      // =====================================

      const dailyCalories =
        calculateDailyCalories(profile);

      const proteinTarget =
        calculateProteinTarget(profile);

      // =====================================
      // 3. جلب وجبات اليوم
      // =====================================

      const mealsRef = collection(
        db,
        "users",
        user.uid,
        "meals"
      );

      const mealsSnapshot =
        await getDocs(mealsRef);

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const startOfToday =
        today.getTime();

      const meals: Meal[] =
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

      // =====================================
      // 4. السعرات والبروتين المستهلك
      // =====================================

      const consumedCalories =
        meals.reduce(
          (total, meal) =>
            total +
            Number(
              meal.calories || 0
            ),
          0
        );

      const consumedProtein =
        meals.reduce(
          (total, meal) =>
            total +
            Number(
              meal.protein || 0
            ),
          0
        );

      // =====================================
      // 5. المتبقي
      // =====================================

      const remainingCalories =
        Math.max(
          dailyCalories -
            consumedCalories,
          0
        );

      const remainingProtein =
        Math.max(
          proteinTarget -
            consumedProtein,
          0
        );

      // =====================================
      // 6. إرسال البيانات للـ Backend
      // =====================================

      const response = await fetch(
        "http://localhost:3001/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: userText,

            userProfile: profile,

            meals,

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
        throw new Error(
          "حدث خطأ في الاتصال بالسيرفر"
        );
      }

      const data =
        await response.json();

      // =====================================
      // 7. رد الـ AI
      // =====================================

      const aiMessage: Message = {
        id: Date.now() + 1,
        text:
          data.answer ||
          "لم يصل رد من الـ AI.",
        sender: "ai",
      };

      setMessages((prev) => [
        ...prev,
        aiMessage,
      ]);
    } catch (error) {
      console.error(
        "AI Error:",
        error
      );

      const errorMessage: Message = {
        id: Date.now() + 1,
        text:
          "حدث خطأ أثناء الاتصال بالمساعد الذكي.",
        sender: "ai",
      };

      setMessages((prev) => [
        ...prev,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ai-page">

      {/* =========================================
          Header
      ========================================= */}

      <div className="ai-header">
        <div className="ai-title">

          <div className="ai-icon">
            <FiMessageCircle />
          </div>

          <div>
            <h1>
              AI Assistant
            </h1>

            <p>
              Your personal nutrition assistant
            </p>
          </div>

        </div>
      </div>

      {/* =========================================
          Chat
      ========================================= */}

      <div className="ai-chat">

        {messages.length === 0 ? (

          <div className="ai-welcome">

            <div className="ai-welcome-icon">
              🥗
            </div>

            <h2>
              Hi! I'm your Nutrition AI 👋
            </h2>

            <p>
              Ask me anything about
              nutrition, meals, calories,
              or your daily goals.
            </p>

          </div>

        ) : (

          <div className="ai-messages">

            {messages.map((msg) => (

              <div
                key={msg.id}
                className={`ai-message ${
                  msg.sender === "user"
                    ? "user-message"
                    : "ai-message-bubble"
                }`}
              >
                {msg.text}
              </div>

            ))}

            {loading && (
              <div className="ai-message ai-message-bubble">
                Thinking... 🤔
              </div>
            )}

          </div>
        )}

      </div>

      {/* =========================================
          Quick Suggestions
      ========================================= */}

      <div className="ai-suggestions">

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            handleSend(
              "اقترحلي وجبة عشاء مناسبة لوضعي اليوم."
            )
          }
        >
          🍽️ اقترحلي عشاء
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            handleSend(
              "شو فيني آكل مع السعرات والبروتين المتبقيين اليوم؟"
            )
          }
        >
          🥗 شو آكل اليوم؟
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            handleSend(
              "اقترحلي وجبة عالية بالبروتين ومناسبة لهدفي."
            )
          }
        >
          💪 وجبة عالية بالبروتين
        </button>

      </div>

      {/* =========================================
          Input
      ========================================= */}

      <div className="ai-input-area">

        <input
          type="text"
          placeholder="Ask me something about nutrition..."
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !loading
            ) {
              handleSend();
            }
          }}
          disabled={loading}
        />

        <button
          type="button"
          onClick={() =>
            handleSend()
          }
          disabled={
            loading ||
            !message.trim()
          }
        >
          <FiSend />
        </button>

      </div>

    </main>
  );
};

export default AIAssistant;