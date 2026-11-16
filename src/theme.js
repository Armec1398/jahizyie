// پالت خواسته‌شده کاربر: شیری، صورتی پاستلی، رز، گیلاسی، زرشکی
export const COLORS = {
  shiri: "#FFF8F0",       // پس‌زمینه اصلی
  pastel: "#FFDCE5",      // صورتی پاستلی
  rose: "#E79FB2",        // رز
  gilasi: "#A4133C",      // گیلاسی (رنگ اصلی برند / دکمه‌ها)
  zershki: "#5C0811",     // زرشکی (متن تیره / هدر)
  white: "#FFFFFF",
  card: "#FFFFFF",
  text: "#3D1A23",
  muted: "#9A6B76",
  border: "#F3C9D4",
  success: "#2A9D8F",
  warning: "#D98E04",
  danger: "#A4133C",
  gray: "#B8B8B8",
};

export const PRIORITY = {
  essential: { key: "essential", label: "ضروری", color: "#A4133C", bg: "#FBDCE5" },
  normal: { key: "normal", label: "عادی", color: "#9A5B3C", bg: "#FFEEDD" },
  unimportant: { key: "unimportant", label: "مهم نیست", color: "#8A8A8A", bg: "#F1F1F1" },
};

export const STATUS = {
  not_bought: { key: "not_bought", label: "خرید نشده", color: "#8A8A8A", bg: "#F1F1F1" },
  buying: { key: "buying", label: "در حال خرید", color: "#B7791F", bg: "#FFF3D6" },
  bought: { key: "bought", label: "خرید شده", color: "#1B7A6E", bg: "#D9F2EE" },
};

export const PAY_METHOD = {
  cash: { key: "cash", label: "نقد" },
  check: { key: "check", label: "چکی" },
  snapppay: { key: "snapppay", label: "اسنپ‌پی" },
  digipay: { key: "digipay", label: "دیجی‌پی" },
};

export const faNum = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "۰";
  return Number(n).toLocaleString("fa-IR");
};

export const parsePrice = (s) => {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const en = String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[^0-9]/g, "");
  return en ? parseInt(en, 10) : 0;
};
