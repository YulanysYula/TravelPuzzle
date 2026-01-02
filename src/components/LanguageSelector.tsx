import { type Language } from "@/utils/translations";
import { motion } from "framer-motion";

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageSelector = ({ currentLanguage, onLanguageChange }: LanguageSelectorProps) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex items-center bg-white/40 backdrop-blur-md rounded-full p-1 border border-white/40 shadow-xl group hover:bg-white/60 transition-all duration-300">
      <motion.div
        className="flex gap-1 relative h-9 items-center px-1"
        layout
      >
        <button
          onClick={() => onLanguageChange("ru")}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            currentLanguage === "ru" ? "text-blue-700" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="text-base">🇷🇺</span>
          <span className="hidden sm:inline uppercase tracking-wider">RU</span>
          {currentLanguage === "ru" && (
            <motion.div
              layoutId="lang-active"
              className="absolute inset-0 bg-white rounded-full shadow-lg -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>

        <button
          onClick={() => onLanguageChange("en")}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            currentLanguage === "en" ? "text-blue-700" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="text-base">🇬🇧</span>
          <span className="hidden sm:inline uppercase tracking-wider">EN</span>
          {currentLanguage === "en" && (
            <motion.div
              layoutId="lang-active"
              className="absolute inset-0 bg-white rounded-full shadow-lg -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      </motion.div>
    </div>
  );
};
