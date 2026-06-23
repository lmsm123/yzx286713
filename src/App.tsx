import { useState, useEffect } from "react";
import { AtmosphereConfig, TimeOfDay, InkStroke, PoemAnalysis } from "./types";
import { ShanshuiCanvas } from "./components/ShanshuiCanvas";
import { ControlPanel } from "./components/ControlPanel";
import { PoetryAI } from "./components/PoetryAI";
import { shanshuiSynth } from "./utils/audio";
import { 
  Sparkles, Compass, EyeOff, Music, Volume2, Info, BookOpen, Heart, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OpeningAnimation } from "./components/OpeningAnimation";

const INITIAL_ATMOSPHERE: AtmosphereConfig = {
  windSpeed: 0.35,
  windAngle: 0, // Left to right
  mistDensity: 0.55,
  mistSpeed: 0.2,
  timeOfDay: TimeOfDay.NOON,
  rainIntensity: 0.0,
  horseState: "grazing",
  soundscapesEnabled: true, // Default to true for immersive full-screen experience
};

export default function App() {
  const [config, setConfig] = useState<AtmosphereConfig>(INITIAL_ATMOSPHERE);
  const [inkStrokes, setInkStrokes] = useState<InkStroke[]>([]);
  const [paintMode, setPaintMode] = useState<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>("#0a0a0a");
  const [brushSize, setBrushSize] = useState<number>(6);
  const [showLegend, setShowLegend] = useState<boolean>(true); // Show on start for immersive context
  const [introActive, setIntroActive] = useState<boolean>(true); // OPENING: Control play status of the 3D scroll opening animation

  const handleApplyConfig = (newConfig: AtmosphereConfig) => {
    setConfig(newConfig);
  };

  const handleAddStroke = (newStroke: InkStroke) => {
    setInkStrokes(prev => [...prev, newStroke]);
  };

  const handleClearStrokes = () => {
    setInkStrokes([]);
    shanshuiSynth.playPluck(130.81); // low gong note
  };

  const toggleLegend = () => {
    const nextState = !showLegend;
    setShowLegend(nextState);
    if (config.soundscapesEnabled) {
      shanshuiSynth.playPluck(nextState ? 440.00 : 330.00); // Gu-zheng audio response
    }
  };

  return (
    <div className="w-screen h-screen bg-[#f5f2e9] text-stone-800 select-none overflow-hidden relative" id="applet-main-container">
      
      {/* 3D Scroll Intro Opening Sequence (Z-Index 100) */}
      <AnimatePresence>
        {introActive && (
          <OpeningAnimation onComplete={() => setIntroActive(false)} />
        )}
      </AnimatePresence>

      {!introActive && (
        <>
          {/* Background waterwash pattern style overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#d6ccc2_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Core Interactive Ink-Wash Shanshui Canvas (Full-viewport) */}
          <div className="w-full h-full animate-[fadeIn_0.5s_ease-out]" id="core-rendering-canvas-wrapper">
            <ShanshuiCanvas 
              config={config} 
              inkStrokes={inkStrokes}
              onAddStroke={handleAddStroke}
              paintMode={paintMode}
              brushColor={brushColor}
              brushSize={brushSize}
            />
          </div>

          {/* Floating minimalist brushed-paper test indicator */}
          <div className="absolute top-4 left-6 pointer-events-none opacity-45 hover:opacity-100 transition-opacity duration-300 font-serif text-[11px] tracking-wider text-stone-600 bg-stone-100/30 backdrop-blur-[2px] border border-stone-200/20 px-3 py-1.5 rounded-sm select-none" id="night-scroll-hotkey-hint">
            雅韵提示：按键盘【 <span className="font-bold border border-stone-400 px-1 rounded-sm bg-stone-150 text-stone-700">T</span> 】键可随时在「白天山水」和「江南春夜」双画卷间切换测试。
          </div>

          {/* Floating Legend / Background Story toggle button */}
          <div className="absolute top-4 right-6 z-30" id="legend-toggle-wrapper">
            <button
              onClick={toggleLegend}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#faf7ef]/90 hover:bg-[#faf7ef] active:scale-95 text-stone-700 font-serif text-[11.5px] border border-stone-300/40 shadow-sm transition-all duration-300 pointer-events-auto cursor-pointer"
              id="legend-toggle-btn"
            >
              <BookOpen size={13} className="text-amber-800" />
              <span>画卷说 · 故事背景</span>
            </button>
          </div>

          {/* Classical narrative preface overlay (story background and story beginning) */}
          <AnimatePresence>
            {showLegend && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute top-16 right-6 z-30 max-w-[340px] pointer-events-auto"
                id="narrative-parchment-legend"
              >
                <div className="relative bg-[#faf7ef]/95 backdrop-blur-[8px] border-l-4 border-[#8c2d19] border-y border-r border-stone-300/40 p-5 rounded-sm shadow-[5px_5px_25px_rgba(40,35,30,0.08)] select-text">
                  
                  {/* Close Button */}
                  <button 
                    onClick={toggleLegend}
                    className="absolute top-3 right-3 text-stone-400 hover:text-stone-700 active:scale-90 transition-all cursor-pointer"
                    id="close-legend-btn"
                  >
                    <X size={15} />
                  </button>

                  {/* Red Traditional Signet Accent */}
                  <div className="absolute bottom-5 right-5 pointer-events-none select-none opacity-[0.85] w-9 h-9 bg-[#c23a2b] text-[10.5px] text-[#faf7ef] font-serif font-bold flex items-center justify-center rounded-[2px] shadow-sm border border-[#a12f23]">
                    神图
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-[15px] font-bold tracking-wider text-stone-800 border-b border-stone-200/60 pb-2 mb-3.5 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-[#8c2d19] inline-block" />
                    感物造境 · 无尽奇卷
                  </h3>

                  {/* Background Section */}
                  <div className="mb-4">
                    <h4 className="font-serif text-[12px] font-bold text-[#8c2d19] mb-1.5 tracking-wide">
                      【 奇卷背景 】
                    </h4>
                    <p className="font-serif text-[11px] leading-[1.65] text-stone-700 text-justify tracking-wide">
                      这幅流传自上古的《感物造境》乃瑶池仙玉所化，能凭观者的心引神会，演化无边乾坤。
                      画中乾坤颠倒日月：
                      <span className="font-semibold text-stone-800">白天</span>，金乌高照，千万片碎金粼粼闪耀湖面，锦鲤跃波；
                      <span className="font-semibold text-[#8c2d19]">春夜</span>，圆月倒影在水底沉为美玉，流萤依偎着群山草木若星汉流转。
                      捏拿指尖可调拨日月，起「剑指诀」更可唤醒天庭圣境，现西王母之妙相。
                    </p>
                  </div>

                  {/* Opening Section */}
                  <div>
                    <h4 className="font-serif text-[12px] font-bold text-[#8c2d19] mb-1.5 tracking-wide">
                      【 故事序章 】
                    </h4>
                    <p className="font-serif text-[11px] leading-[1.65] text-stone-600 italic text-justify tracking-wide border-t border-stone-200/30 pt-2">
                      “万物心造，笔落乾坤。”
                      <br /><br />
                      江南竹阁内，烛影轻曳，一幅尘封千年的宣纸徐徐铺展。虚空中，你的指尖微微划过，画上沉睡的墨痕骤然如江水活化。
                      群鸟振飞，微雨蒙蒙，本应悬于九天之上的金乌与明月，竟任由你的聚指捏拿抛向群山。当夜色降临，你握拳聚引起万点流萤，复又挥掌抛洒向辽阔夜空。整轴江南山水随你手掌流转而悠悠卷动……
                    </p>
                  </div>

                  {/* Touch hint footer */}
                  <div className="mt-4 pt-2 border-t border-stone-200/50 flex items-center gap-1.5 text-[9.5px] font-sans text-stone-400 select-none">
                    <Heart size={10} className="text-red-700 animate-pulse" />
                    <span>交互手势：握拳(聚萤) · 展掌(撒萤及推卷) · 捏拿(曳日月)</span>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

    </div>
  );
}

