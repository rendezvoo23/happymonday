import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const words = ["finance", "rhythm", "AI"];

export const LandingPage = () => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500); // Slightly slower for better readability of the sliding
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background ambient gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
        <div className="text-[3.5rem] md:text-[5rem] font-semibold tracking-tight leading-tight text-gray-900 dark:text-gray-100 flex flex-col items-center w-full transition-colors duration-200">
          <span className="mb-4">Your</span>

          <div className="relative w-full h-[100px] flex justify-center items-center overflow-visible">
            <AnimatePresence mode="wait">
              <motion.div
                key={words[index]}
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1], // Apple-like ease
                }}
                className="absolute"
              >
                <div className="relative px-12 py-3 bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-full shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-none border border-white/50 dark:border-white/10 min-w-[280px] flex justify-center items-center transition-colors duration-200">
                  <span className="text-gray-900 dark:text-gray-100">{words[index]}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          onClick={() => navigate("/dashboard")}
          className="mt-24 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-medium text-lg hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg z-20"
        >
          Get Started
        </motion.button>
      </div>
    </div>
  );
};
