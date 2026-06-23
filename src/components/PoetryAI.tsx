import React, { useState } from "react";
import { AtmosphereConfig, PoemAnalysis, TimeOfDay } from "../types";
import { Sparkles, Send, BookOpen, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { shanshuiSynth } from "../utils/audio";

interface PoetryAIProps {
  currentConfig: AtmosphereConfig;
  onApplyConfig: (config: AtmosphereConfig, poemResult?: PoemAnalysis) => void;
}

const CLASSICAL_PRESETS = [
  {
    title: "空山新雨",
    author: "王维",
    lines: "空山新雨后，天气晚来秋。\n明月松间照，清泉石上流。",
    prompt: "空山新雨后，天气晚来秋。明月松间照，清泉石上流。有山涧小溪和喝水的白马，烟雨朦胧。"
  },
  {
    title: "天涯瘦马",
    author: "马致远",
    lines: "枯藤老树昏鸦，小桥流水人家。\n古道西风瘦马，夕阳西下。",
    prompt: "古道西风瘦马，枯藤老树秋风大作，晚霞金黄，柳枝乱颤，马在湖畔寂寞地饮水。"
  },
  {
    title: "春江花月",
    author: "张若虚",
    lines: "春江潮水连海平，海上明月共潮生。\n滟滟随波千万里，何处春江无月明！",
    prompt: "海上生明月，春江潮水连海平，夜幕幽静，风平浪静，薄雾如绸缎般漂移。"
  },
  {
    title: "独钓寒江",
    author: "柳宗元",
    lines: "千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。",
    prompt: "独钓寒江雪，千山鸟飞绝，深冬大雾迷茫，寒风呼啸，细雨冬雪夹杂，黑白枯禅之境。"
  }
];

export const PoetryAI: React.FC<PoetryAIProps> = ({ currentConfig, onApplyConfig }) => {
  const [inputPoem, setInputPoem] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentPoem, setCurrentPoem] = useState<PoemAnalysis | null>({
    text: "行到水穷处，坐看云起时。",
    translation: "漫步走到山水的尽头，索性席地而坐，静静看群山深处的云雾舒卷、缓缓升腾。此境无风无浪，天地得妙，心旷神怡。",
    mood: "禅意清旷",
    recommendations: {
      windSpeed: 0.15,
      mistDensity: 0.75,
      timeOfDay: TimeOfDay.NOON,
      rainIntensity: 0.0,
      horseState: "grazing"
    }
  });

  const handleInterpret = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    
    // Play high tone note represent AI meditation
    shanshuiSynth.playPluck(523.25); // high Do note

    try {
      const response = await fetch("/api/gemini/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poem: queryText }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to communicate with classical poet mind.";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const text = await response.text();
            if (text && text.length < 150) {
              errorMsg = text;
            }
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        throw new Error(errorMsg);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server did not return JSON. Dev server might be starting up or in fallback mode.");
      }

      const data = await response.json();
      const result: PoemAnalysis = data;
      
      // Map server API parameters to frontend state
      const appliedAtmosphere: AtmosphereConfig = {
        windSpeed: result.recommendations.windSpeed,
        windAngle: result.recommendations.windAngle,
        mistDensity: result.recommendations.mistDensity,
        mistSpeed: result.recommendations.mistSpeed,
        timeOfDay: result.recommendations.timeOfDay,
        rainIntensity: result.recommendations.rainIntensity,
        horseState: result.recommendations.horseState,
        soundscapesEnabled: currentConfig.soundscapesEnabled
      };

      onApplyConfig(appliedAtmosphere, result);
      setCurrentPoem(result);
      
      // Play high pluck notes cascade in pentatonic chord
      setTimeout(() => shanshuiSynth.playPluck(587.33), 150);
      setTimeout(() => shanshuiSynth.playPluck(659.25), 300);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "无法连通古典诗画大模型，已进入本地韵律模拟。");
      
      // Fallback: Programmatic local rule-based parsing if offline / key missing
      generateLocalInterpretationFallback(queryText);
    } finally {
      setLoading(false);
    }
  };

  // Safe client-side rule-base interpretation fallback
  const generateLocalInterpretationFallback = (text: string) => {
    let wind = 0.25;
    let clouds = 0.45;
    let rain = 0.0;
    let time = TimeOfDay.NOON;
    let horse: "alert" | "grazing" | "drinking" = "grazing";
    let interpretedMood = "山水空灵";
    let literalTranslation = "山水入梦，心随墨生。此意境轻抚涟漪，远山暮云，相映成趣。";

    const lower = text.toLowerCase();
    if (lower.includes("风") || lower.includes("西风") || lower.includes("柳枝摇")) {
      wind = 0.75;
      interpretedMood = "西风萧瑟";
    }
    if (lower.includes("雨") || lower.includes("淋") || lower.includes("溪")) {
      rain = 0.55;
      interpretedMood = "细雨润岸";
      literalTranslation = "山河细雨，墨色入水。湖岸烟雨迷离，柳丝轻缀，洗尽凡尘喧哗。";
    }
    if (lower.includes("雪") || lower.includes("冬") || lower.includes("寒")) {
      time = TimeOfDay.NIGHT;
      clouds = 0.8;
      interpretedMood = "清寒傲冬";
    }
    if (lower.includes("夕阳") || lower.includes("晚霞") || lower.includes("落日")) {
      time = TimeOfDay.GOLDEN;
      interpretedMood = "晚染秋山";
    }
    if (lower.includes("月") || lower.includes("夜") || lower.includes("明月")) {
      time = TimeOfDay.NIGHT;
      interpretedMood = "烟江月色";
    }
    if (lower.includes("马") || lower.includes("饮") || lower.includes("喝水")) {
      horse = "drinking";
    }

    const fallbackPoem: PoemAnalysis = {
      text,
      translation: literalTranslation + " (注：未检测到服务密钥，已进入本地画韵引擎。)",
      mood: interpretedMood,
      recommendations: {
        windSpeed: wind,
        windAngle: 0,
        mistDensity: clouds,
        mistSpeed: 0.25,
        rainIntensity: rain,
        timeOfDay: time,
        horseState: horse
      }
    };

    const appliedAtmosphere: AtmosphereConfig = {
      windSpeed: wind,
      windAngle: 0,
      mistDensity: clouds,
      mistSpeed: 0.3,
      timeOfDay: time,
      rainIntensity: rain,
      horseState: horse,
      soundscapesEnabled: currentConfig.soundscapesEnabled
    };

    onApplyConfig(appliedAtmosphere, fallbackPoem);
    setCurrentPoem(fallbackPoem);
  };

  return (
    <div className="w-full flex flex-col gap-5 p-5 bg-stone-50/85 rounded-xl border border-stone-200 shadow-sm" id="poetry-ai-section">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-medium text-stone-800 flex items-center gap-2" id="poetry-header-title">
          <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
          AI 画意解诗 <span className="text-xs font-sans text-stone-500 font-normal">输入古诗词，变换水墨天气</span>
        </h3>
        {loading && <RefreshCw className="w-4 h-4 text-stone-400 animate-spin" />}
      </div>

      {/* Input section */}
      <div className="flex gap-2">
        <input
          type="text"
          id="poetry-poem-input"
          value={inputPoem}
          onChange={(e) => setInputPoem(e.target.value)}
          placeholder="请输入诗句，如：空山新雨后..."
          className="flex-1 bg-white border border-stone-300 outline-none rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/20 transition-all font-serif"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleInterpret(inputPoem);
          }}
          disabled={loading}
        />
        <button
          id="poetry-interpret-btn"
          onClick={() => handleInterpret(inputPoem)}
          disabled={loading || !inputPoem.trim()}
          className="bg-stone-800 hover:bg-stone-700 active:bg-stone-900 disabled:opacity-40 text-stone-100 font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm transition-all shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          解意
        </button>
      </div>

      {/* Classical Presets Gallery */}
      <div className="flex flex-col gap-2" id="presets-gallery-container">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-sans">
          <BookOpen className="w-3.5 h-3.5" />
          <span>经典山水诗词推荐：</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" id="presets-grid">
          {CLASSICAL_PRESETS.map((p, index) => (
            <button
              key={index}
              id={`preset-btn-${index}`}
              onClick={() => {
                setInputPoem(p.lines.replace("\n", ""));
                handleInterpret(p.prompt);
              }}
              disabled={loading}
              className="bg-white hover:bg-amber-50/50 border border-stone-200 hover:border-amber-400 rounded-lg p-2.5 text-left transition-all active:scale-95 flex flex-col justify-between group"
            >
              <span className="font-serif text-sm text-stone-800 group-hover:text-amber-800 font-medium transition-colors">
                {p.title}
              </span>
              <span className="text-[10px] text-stone-400 font-sans mt-0.5">
                {p.author}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Interpretation Scroll Display */}
      <AnimatePresence mode="wait">
        {currentPoem && (
          <motion.div
            key={currentPoem.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            id="poetry-scroll-result"
            className="border-t border-stone-200 pt-4 flex gap-4 md:flex-row flex-col justify-between bg-amber-50/25 p-4 rounded-xl border border-amber-900/10 shadow-inner"
          >
            {/* Poetry Calligraphy Column (Vertical traditional writing! 竖排文字) */}
            <div className="flex items-start md:w-1/3 md:border-r border-stone-200 pr-4 md:mb-0 mb-3" id="vertical-scroll-calligraphy">
              <div className="flex gap-4 mx-auto md:mx-0">
                {/* Traditional Vertical stamp style */}
                <div className="flex flex-col justify-center border-l-2 border-red-800 pl-3 leading-loose py-2">
                  <span className="font-serif font-semibold text-lg text-amber-900 tracking-wider vertical-text">
                    {currentPoem.text.replace(/，/g, " ⚬ ").replace(/。/g, "")}
                  </span>
                </div>
                
                {/* Mood signature stamp */}
                <div className="flex flex-col items-center justify-start mt-2">
                  <div className="bg-red-600/90 text-white font-serif font-black text-[9px] px-1 py-1 rounded shadow-sm text-center tracking-widest max-w-[20px] leading-tight">
                    {currentPoem.mood.split("").map((c, i) => (
                      <div key={i}>{c}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Translation & Interpretation analysis */}
            <div className="flex-1 flex flex-col justify-center pr-1" id="poetry-interpretation-analysis">
              <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase mb-1">
                画意大意 / Literary Mood Interpretation
              </span>
              <p className="font-serif text-[13px] text-stone-700 leading-relaxed text-justify">
                {currentPoem.translation}
              </p>
              
              {/* Dynamic Applied Parameters Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 text-[11px] font-sans text-stone-500 border-t border-stone-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  <span>时辰:</span>
                  <span className="font-medium text-stone-800">
                    {currentPoem.recommendations.timeOfDay === TimeOfDay.DAWN && "晨曦粉黛"}
                    {currentPoem.recommendations.timeOfDay === TimeOfDay.NOON && "正午宣黄"}
                    {currentPoem.recommendations.timeOfDay === TimeOfDay.GOLDEN && "琥珀余晖"}
                    {currentPoem.recommendations.timeOfDay === TimeOfDay.NIGHT && "寒夜墨蓝"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  <span>风速:</span>
                  <span className="font-medium text-stone-800">
                    {Math.round(currentPoem.recommendations.windSpeed * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  <span>烟雨:</span>
                  <span className="font-medium text-stone-800">
                    {currentPoem.recommendations.rainIntensity > 0 ? "蒙蒙细雨" : "无雨清空"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  <span>白马:</span>
                  <span className="font-medium text-stone-800 col-span-1 capitalize">
                    {currentPoem.recommendations.horseState === "drinking" && "俯垂溪饮"}
                    {currentPoem.recommendations.horseState === "grazing" && "悠然漫游"}
                    {currentPoem.recommendations.horseState === "alert" && "耸耳凝望"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error / Falback Alert banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100/75 border border-amber-200 rounded-lg p-3"
            id="error-banner"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="font-medium">温馨提示：</span>
              <span>{errorMsg}已为您智能开启“本地心境解析”提供完整的诗情画意调节，请继续享用山水之旅。</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
