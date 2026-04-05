import { useTheme } from "@/lib/providers/ThemeProvider";

interface LogoProps {
  fillColor?: string;
  darkmode?: string;
}

const Logo = ({ fillColor = "#1F2937", darkmode = "#FFFFFF" }: LogoProps) => {
  const { theme } = useTheme();
  const textColor = theme === "dark" ? darkmode : fillColor;

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-color text-sm font-extrabold text-white"
        aria-hidden
      >
        KK
      </span>
      <div className="leading-tight">
        <p
          className="text-sm font-extrabold tracking-tight md:text-base"
          style={{ color: textColor }}
        >
          Kolkatas Kitchen
        </p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-primary-color">
          Authentic Kolkata Flavours
        </p>
      </div>
    </div>
  );
};

export default Logo;
