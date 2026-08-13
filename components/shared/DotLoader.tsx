import DotLoader from "react-spinners/DotLoader";
import { CSSProperties } from "react";

interface DotLoaderSpinnerProps {
  loading: boolean;
  color?: string;
  size?: number;
  speedMultiplier?: number;
  cssOverride?: CSSProperties;
  backdropBlur?: boolean | string;
  backdropOpacity?: number;
  className?: string;
  showText?: boolean;
  text?: string;
  textClassName?: string;
  spinnerClassName?: string;
  backdropColor?: string;
}

export default function DotLoaderSpinner({
  loading,
  color = "#14b8a6", // teal-500 to match your gradient
  size = 60,
  speedMultiplier = 1,
  cssOverride = {},
  backdropBlur = true,
  backdropOpacity = 45,
  className = "",
  showText = false,
  text = "Loading...",
  textClassName = "",
  spinnerClassName = "",
  backdropColor = "bg-black/40 dark:bg-black/60",
}: DotLoaderSpinnerProps) {
  if (!loading) return null;

  const getBlurClass = () => {
    if (typeof backdropBlur === "string") return backdropBlur;
    return backdropBlur ? "backdrop-blur-xl" : "";
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 grid place-items-center 
        transition-all duration-300 
        ${backdropColor} ${getBlurClass()} ${className}
      `}
      style={
        { "--tw-bg-opacity": backdropOpacity / 100 } as React.CSSProperties
      }
      aria-live="assertive"
      aria-busy={loading}
      role="status"
    >
      <div
        className="
          flex flex-col items-center gap-4 
          px-6 py-5 
          rounded-3xl 
          shadow-2xl 
          bg-white/80 dark:bg-[#1e293b]/80 
          backdrop-blur-2xl 
          border border-white/30 dark:border-[#334155]/40
          transition-all duration-300
          max-w-[90%] sm:max-w-sm
        "
      >
        <DotLoader
          color={color}
          loading={loading}
          size={size}
          speedMultiplier={speedMultiplier}
          cssOverride={{
            display: "block",
            margin: "0 auto",
            animation: "pulse 1.5s infinite ease-in-out",
            ...cssOverride,
          }}
          className={spinnerClassName}
          aria-label="Loading spinner"
        />

        <span className="sr-only">{text}</span>

        {showText && (
          <p
            className={
              textClassName ||
              "text-[#1f2937] dark:text-[#e2e8f0] text-sm sm:text-base font-medium tracking-wide"
            }
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
