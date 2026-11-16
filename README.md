# جهیزیه — مینی‌اپ لیست خرید (React Native + Expo)

مینیمال، فارسی و راست‌چین، فونت وزیرمتن، پالت: شیری `#FFF8F0` / صورتی پاستلی `#FFDCE5` / رز `#E79FB2` / گیلاسی `#A4133C` / زرشکی `#5C0811`

## امکانات
- دسته اصلی → زیرمنو → کالا (هر سه: افزودن / ویرایش / حذف)
- شروع کاملاً خالی (طبق خواسته تو)، بدون داده پیش‌فرض
- هر کالا: عکس، اولویت رنگی (ضروری / عادی / مهم نیست)، وضعیت (خرید شده / خرید نشده / در حال خرید با تغییر سریع ↻)، فروشگاه + قیمت + مبلغ پرداخت‌شده، نحوه خرید (نقد / چکی / اسنپ‌پی / دیجی‌پی)، رسید خرید (عکس از گالری)، یادداشت
- صفحه مالی 💰: جمع کل، پرداخت‌شده، مانده/قسط، درصد پیشرفت، تفکیک نقد/چک/اسنپ‌پی/دیجی‌پی، لیست بدهی‌ها — واحد تومان
- ذخیره فقط روی گوشی (AsyncStorage)، آفلاین کامل
- بکاپ: دکمه 📤 خروجی JSON + اشتراک‌گذاری

## اجرا روی گوشی خودت (سریع‌ترین راه)
```bash
npm install          # اگر اینترنت ایران اذیت کرد:
npm --registry https://registry.npmmirror.com install
npx expo start
```
بعد با اپ Expo Go روی اندروید QR را اسکن کن.

## گرفتن APK از گیت‌هاب (پیشنهادی، بدون نیاز به EAS)
1. همین پوشه را push کن به `https://github.com/Armec1398/jahizyie` برنچ `main`
2. تب Actions → workflow «Build Android APK» اجرا می‌شود
3. از بخش Artifacts فایل `jahizyie-apk` را دانلود کن و روی گوشی نصب کن

## گرفتن APK با EAS (جایگزین)
```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview
```

## ساختار داده
```
categories: [{id, name}]
subs: [{id, categoryId, name}]
items: [{id, subId, name, photo, priority, status, store, price, paidAmount, payMethod, receipt, note}]
```

## تعویض آیکون
فایل‌های `assets/icon.png` فعلاً placeholder یک‌پیکسلی‌اند. آیکون واقعی 1024×1024 بگذار و دوباره بیلد بگیر.
