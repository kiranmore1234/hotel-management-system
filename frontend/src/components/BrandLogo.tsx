import Image from "next/image";

export function BrandLogo({
  name,
  compact = false,
  tone = "dark",
}: {
  name: string;
  compact?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Image
        src="/niyojan-mark.svg"
        alt=""
        width={compact ? 40 : 48}
        height={compact ? 40 : 48}
        priority
        className="shrink-0"
      />
      <span className="min-w-0">
        <span className={`block truncate font-display text-[17px] font-semibold tracking-wide ${tone === "dark" ? "text-[#f4e7ce]" : "text-[#18352c]"}`}>
          {name}
        </span>
      </span>
    </span>
  );
}
