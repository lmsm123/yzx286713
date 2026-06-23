import React from "react";
import { AtmosphereConfig, TimeOfDay } from "../types";
import { 
  Sun, Moon, Sunrise, Sunset, Wind, Cloud, Droplets, 
  Volume2, VolumeX, Edit2, Play, Compass, Trash2, Eye, Paintbrush, LoaderPinwheel
} from "lucide-react";
import { shanshuiSynth } from "../utils/audio";

interface ControlPanelProps {
  config: AtmosphereConfig;
  onChangeConfig: (config: AtmosphereConfig) => void;
  paintMode: boolean;
  setPaintMode: (mode: boolean) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  onClearStrokes: () => void;
  onToggleZen: () => void;
  strokeCount: number;
}

const BRUSH_COLORS = [
  { name: "水墨浓黑", value: "#0a0a0a" },
  { name: "朱砂", value: "#b91c1c" },
  { name: "黛绿", value: "#0f766e" },
  { name: "赭石", value: "#c2410c" },
  { name: "藤黄", value: "#ca8a04" },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChangeConfig,
  paintMode,
  setPaintMode,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  onClearStrokes,
  onToggleZen,
  strokeCount,
}) => {
  const updateParam = <K extends keyof AtmosphereConfig>(key: K, value: AtmosphereConfig[K]) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  // Toggle procedural Guzheng pluck sound
  const handleSoundscapeToggle = () => {
    const nextState = !config.soundscapesEnabled;
    updateParam("soundscapesEnabled", nextState);
    if (nextState) {
      shanshuiSynth.playPluck(); // Warm play chord trigger
    }
  };

  const handleHorseStateChange = (state: AtmosphereConfig["horseState"]) => {
    updateParam("horseState", state);
    if (state === "drinking") {
      // Trigger ripples waterfall
    } else {
      shanshuiSynth.playPluck(261.63); // low Do note
    }
  };

  return (
    <div className="w-full h-full bg-white/95 rounded-2xl border border-stone-200/80 shadow-lg p-5 flex flex-col gap-6" id="shanshui-control-panel">
      
      {/* 1. Header with Zen Mode Toggle & Synthesizer controls */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <h2 className="font-serif text-xl font-bold text-stone-800 tracking-wide" id="control-panel-heading">
            水墨意境控制台
          </h2>
          <p className="text-xs font-sans text-stone-500 mt-0.5">调控天地万象，融入意境画音</p>
        </div>
        
        <div className="flex gap-2">
          {/* Sounds Toggle */}
          <button
            id="toggle-audio-btn"
            onClick={handleSoundscapeToggle}
            className={`p-2 rounded-lg border transition-all ${
              config.soundscapesEnabled
                ? "bg-stone-800 border-stone-800 text-stone-100 shadow-sm"
                : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
            }`}
            title={config.soundscapesEnabled ? "关闭琴钟意境音效" : "开启古筝/风卷琴瑟音效"}
          >
            {config.soundscapesEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Full Screen Zen View */}
          <button
            id="toggle-zen-btn"
            onClick={onToggleZen}
            className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-all shadow-sm flex items-center gap-1 text-xs"
            title="隐藏控制台，进入画卷禅定"
          >
            <Eye className="w-4 h-4 text-stone-500" />
            <span>忘我观赏</span>
          </button>
        </div>
      </div>

      {/* 2. CHINESE TIME OF DAY PRESETS (时辰时轴雅色) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold font-sans text-stone-600 tracking-widest uppercase">
          时辰雅色 (时态画布色调)
        </label>
        <div className="grid grid-cols-4 gap-1.5" id="time-ofcase-selector">
          <button
            id="time-dawn-btn"
            onClick={() => updateParam("timeOfDay", TimeOfDay.DAWN)}
            className={`py-2 px-1.5 rounded-lg border transition-all flex flex-col items-center gap-1 ${
              config.timeOfDay === TimeOfDay.DAWN
                ? "border-sky-500 bg-sky-50/50 text-sky-800 shadow-inner"
                : "border-stone-200 hover:bg-stone-50 text-stone-600"
            }`}
          >
            <Sunrise className="w-4 h-4 text-sky-500" />
            <span className="font-serif text-[11px] font-semibold">晨曦</span>
          </button>

          <button
            id="time-noon-btn"
            onClick={() => updateParam("timeOfDay", TimeOfDay.NOON)}
            className={`py-2 px-1.5 rounded-lg border transition-all flex flex-col items-center gap-1 ${
              config.timeOfDay === TimeOfDay.NOON
                ? "border-amber-500 bg-amber-50/20 text-amber-800 shadow-inner"
                : "border-stone-200 hover:bg-stone-50 text-stone-600"
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="font-serif text-[11px] font-semibold">正午</span>
          </button>

          <button
            id="time-golden-btn"
            onClick={() => updateParam("timeOfDay", TimeOfDay.GOLDEN)}
            className={`py-2 px-1.5 rounded-lg border transition-all flex flex-col items-center gap-1 ${
              config.timeOfDay === TimeOfDay.GOLDEN
                ? "border-orange-500 bg-orange-50/30 text-orange-800 shadow-inner"
                : "border-stone-200 hover:bg-stone-50 text-stone-600"
            }`}
          >
            <Sunset className="w-4 h-4 text-orange-500" />
            <span className="font-serif text-[11px] font-semibold">暮夕</span>
          </button>

          <button
            id="time-night-btn"
            onClick={() => updateParam("timeOfDay", TimeOfDay.NIGHT)}
            className={`py-2 px-1.5 rounded-lg border transition-all flex flex-col items-center gap-1 ${
              config.timeOfDay === TimeOfDay.NIGHT
                ? "border-indigo-800 bg-indigo-50/20 text-indigo-900 shadow-inner"
                : "border-stone-200 hover:bg-stone-50 text-stone-600"
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-700" />
            <span className="font-serif text-[11px] font-semibold">烟夜</span>
          </button>
        </div>
      </div>

      {/* 3. DYNAMIC SIMULATOR SLIDERS */}
      <div className="flex flex-col gap-4">
        <label className="text-xs font-bold font-sans text-stone-600 tracking-widest uppercase">
          天地万象 (动态微风雨雾)
        </label>
        
        {/* Wind Speed (Wind/Willow Sway - Video 3) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-stone-600 font-sans">
            <span className="flex items-center gap-1 font-medium">
              <Wind className="w-3.5 h-3.5 text-stone-500 animate-pulse" />
              西风劲吹 (柳枝与草芥摇曳强度)
            </span>
            <span className="font-mono text-[10px] select-none">{Math.round(config.windSpeed * 100)}%</span>
          </div>
          <input
            type="range"
            id="wind-speed-slider"
            min="0"
            max="1"
            step="0.01"
            value={config.windSpeed}
            onChange={(e) => updateParam("windSpeed", parseFloat(e.target.value))}
            className="w-full accent-stone-700 bg-stone-100 rounded-lg cursor-pointer h-1"
          />
        </div>

        {/* Cloud/Mist Density (Mist Flow - Video 1) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-stone-600 font-sans">
            <span className="flex items-center gap-1 font-medium">
              <Cloud className="w-3.5 h-3.5 text-stone-500" />
              云雾浩渺 (云瀑漫卷密度)
            </span>
            <span className="font-mono text-[10px] select-none">{Math.round(config.mistDensity * 100)}%</span>
          </div>
          <input
            type="range"
            id="mist-density-slider"
            min="0"
            max="1"
            step="0.01"
            value={config.mistDensity}
            onChange={(e) => updateParam("mistDensity", parseFloat(e.target.value))}
            className="w-full accent-stone-700 bg-stone-100 rounded-lg cursor-pointer h-1"
          />
        </div>

        {/* Rain Intensity (Drizzling) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-stone-600 font-sans">
            <span className="flex items-center gap-1 font-medium">
              <Droplets className="w-3.5 h-3.5 text-stone-500" />
              江南春雨 (细雨空蒙效果)
            </span>
            <span className="font-mono text-[10px] select-none">{Math.round(config.rainIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            id="rain-intensity-slider"
            min="0"
            max="1"
            step="0.01"
            value={config.rainIntensity}
            onChange={(e) => updateParam("rainIntensity", parseFloat(e.target.value))}
            className="w-full accent-stone-700 bg-stone-100 rounded-lg cursor-pointer h-1"
          />
        </div>
      </div>

      {/* 4. HORSE STATE RENDER (白马姿态 - Video 2) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold font-sans text-stone-600 tracking-widest uppercase">
          白马饮溪姿形
        </label>
        <div className="grid grid-cols-3 gap-2" id="horse-activity-buttons">
          <button
            id="horse-alert-btn"
            onClick={() => handleHorseStateChange("alert")}
            className={`py-1.5 px-1 rounded-lg border text-xs font-medium transition-all ${
              config.horseState === "alert"
                ? "bg-stone-800 border-stone-800 text-stone-50 shadow"
                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
            }`}
          >
            立马昂首
          </button>
          <button
            id="horse-grazing-btn"
            onClick={() => handleHorseStateChange("grazing")}
            className={`py-1.5 px-1 rounded-lg border text-xs font-medium transition-all ${
              config.horseState === "grazing"
                ? "bg-stone-800 border-stone-800 text-stone-50 shadow"
                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
            }`}
          >
            幽行悠步
          </button>
          <button
            id="horse-drink-trigger"
            onClick={() => handleHorseStateChange("drinking")}
            className={`py-1.5 px-1 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              config.horseState === "drinking"
                ? "bg-amber-700 border-amber-700 text-white shadow animate-pulse"
                : "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/50"
            }`}
          >
            <LoaderPinwheel className="w-3 h-3 text-amber-500 animate-spin" />
            俯垂快饮
          </button>
        </div>
      </div>

      {/* 5. CALLIGRAPHY INK PAINT SWITCHING */}
      <div className="flex flex-col gap-3 border-t border-stone-100 pt-4" id="paint-tools-panel">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-sans text-stone-600 tracking-widest uppercase">
            水墨书画笔法
          </span>
          <button
            id="toggle-paint-mode"
            onClick={() => setPaintMode(!paintMode)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border font-semibold transition-all ${
              paintMode 
                ? "bg-amber-800 border-amber-800 text-amber-50 shadow-sm"
                : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Paintbrush className="w-3 h-3" />
            {paintMode ? "书画笔模式已开启" : "进入传统提笔书画"}
          </button>
        </div>

        {paintMode && (
          <div className="flex flex-col gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100" id="ink-settings-drawer">
            {/* Color selection */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-stone-500 font-sans font-medium">国画传统调色石料：</span>
              <div className="flex gap-2">
                {BRUSH_COLORS.map((col, cIdx) => (
                  <button
                    key={cIdx}
                    id={`brush-color-btn-${cIdx}`}
                    onClick={() => setBrushColor(col.value)}
                    style={{ backgroundColor: col.value }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer relative ${
                      brushColor === col.value ? "border-amber-500 scale-110 shadow-md" : "border-transparent"
                    }`}
                    title={col.name}
                  >
                    {brushColor === col.value && (
                      <span className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Thickness and clearing */}
            <div className="flex items-center justify-between gap-4 mt-1">
              {/* Stroke thickness slider */}
              <div className="flex-1 flex items-center gap-1.5 text-[10px] text-stone-500 font-sans">
                <span>笔锋:</span>
                <input
                  type="range"
                  id="brush-thickness-slider"
                  min="2"
                  max="16"
                  step="0.5"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                  className="w-full accent-stone-700 bg-stone-200 rounded cursor-pointer h-1"
                />
                <span className="font-mono min-w-[20px]">{Math.round(brushSize)}px</span>
              </div>

              {/* Clear canvas strokes button */}
              <button
                id="clear-strokes-btn"
                onClick={onClearStrokes}
                disabled={strokeCount === 0}
                className="hover:text-red-700 disabled:opacity-40 text-stone-500 hover:bg-stone-200/50 p-1.5 rounded-lg border border-stone-200/40 bg-white transition-all text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                title="清除水墨"
              >
                <Trash2 className="w-3 h-3" />
                <span>清除笔迹</span>
              </button>
            </div>
            
            <p className="text-[10px] text-stone-400 font-serif leading-tight select-none mt-1">
              提示：用手指或鼠标在画作上肆意挥洒，下笔后国画颜料会在宣纸上缓缓洇开消失。
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
