import { useEffect, useState } from "react";
import logo from "@/assets/emoney-logo.png";
import { APP_NAME } from "@/lib/constants";

const SPLASH_KEY = "emoney_splash_shown";
const DURATION_MS = 5000;

export function SplashScreen({ children }: { children: React.ReactNode }) {
  // Always start as not-shown to match SSR; decide on client after mount.
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY) === "1") return;
    setShow(true);
    const fadeTimer = setTimeout(() => setFadeOut(true), DURATION_MS - 600);
    const endTimer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      setShow(false);
    }, DURATION_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, []);

  return (
    <>
      {children}
      {show && (
        <div
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 transition-opacity duration-700 ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}
        >
          <style>{`
            @keyframes logoSlideInScale {
              0% {
                opacity: 0;
                transform: scale(0.8) translateY(20px);
              }
              50% {
                opacity: 1;
              }
              100% {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
            @keyframes logoPulse {
              0%, 100% {
                filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.3));
              }
              50% {
                filter: drop-shadow(0 0 30px rgba(0, 255, 255, 0.6));
              }
            }
            .splash-logo {
              animation: logoSlideInScale 1s ease-out forwards, logoPulse 2s ease-in-out 1s infinite;
            }
          `}</style>
          <img
            src={logo}
            alt={APP_NAME}
            className="splash-logo h-screen w-screen object-contain"
          />
        </div>
      )}
    </>
  );
}
