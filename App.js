import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Modal,
  StyleSheet, Alert, Image, ScrollView, I18nManager, ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import {
  useFonts, Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold,
} from "@expo-google-fonts/vazirmatn";
import { COLORS, PRIORITY, STATUS, PAY_METHOD, faNum, parsePrice } from "./src/theme";
import { loadDB, saveDB, uid } from "./src/store";

try { I18nManager.allowRTL(true); I18nManager.forceRTL(true); } catch {}

export default function App() {
  const [fontsLoaded] = useFonts({ Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold });
  const [db, setDb] = useState(null);
  const [nav, setNav] = useState({ screen: "home" }); // home | subs | items | finance
  const [search, setSearch] = useState("");

  useEffect(() => { loadDB().then(setDb); }, []);
  useEffect(() => { if (db) saveDB(db); }, [db]);

  const finance = useMemo(() => {
    if (!db) return { total: 0, paid: 0, remain: 0, debt: 0, byMethod: {} };
    let total = 0, paid = 0;
    const byMethod = { cash: 0, check: 0, snapppay: 0, digipay: 0 };
    for (const it of db.items) {
      const t = Number(it.price || 0);
      total += t;
      let p = Number(it.paidAmount ?? (it.status === "bought" ? t : 0));
      if (p > t) p = t;
      paid += p;
      if (it.payMethod && byMethod[it.payMethod] !== undefined) byMethod[it.payMethod] += t;
    }
    return { total, paid, remain: total - paid, debt: total - paid, byMethod };
  }, [db]);

  if (!fontsLoaded || !db) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.gilasi} />
        <Text style={styles.font}>در حال بارگذاری جهیزیه...</Text>
      </View>
    );
  }

  const cats = db.categories.filter((c) =>
    !search || c.name.includes(search)
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Header
        nav={nav} setNav={setNav} db={db} setDb={setDb}
        finance={finance} search={search} setSearch={setSearch}
      />
      {nav.screen === "home" && (
        <CategoryScreen db={db} setDb={setDb} cats={cats} setNav={setNav} />
      )}
      {nav.screen === "subs" && (
        <SubScreen db={db} setDb={setDb} nav={nav} setNav={setNav} />
      )}
      {nav.screen === "items" && (
        <ItemScreen db={db} setDb={setDb} nav={nav} setNav={setNav} />
      )}
      {nav.screen === "finance" && (
        <FinanceScreen db={db} finance={finance} setNav={setNav} />
      )}
    </View>
  );
}

/* ---------------- Header ---------------- */
function Header({ nav, setNav, db, setDb, finance, search, setSearch }) {
  const exportBackup = async () => {
    try {
      const path = FileSystem.documentDirectory + "jahizyie-backup.json";
      await FileSystem.writeAsStringAsync(path, JSON.stringify(db, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
      else { await Clipboard.setStringAsync(JSON.stringify(db)); Alert.alert("کپی شد", "بکاپ در حافظه کپی شد."); }
    } catch (e) { Alert.alert("خطا", "بکاپ ناموفق بود."); }
  };
  const canBack = nav.screen !== "home";
  const title =
    nav.screen === "home" ? "لیست خرید جهیزیه" :
    nav.screen === "subs" ? (db.categories.find((c) => c.id === nav.categoryId)?.name || "زیرمنوها") :
    nav.screen === "items" ? (db.subs.find((s) => s.id === nav.subId)?.name || "اقلام") : "وضعیت مالی";

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {canBack ? (
          <TouchableOpacity onPress={() => {
            if (nav.screen === "subs") setNav({ screen: "home" });
            else if (nav.screen === "items") setNav({ screen: "subs", categoryId: nav.categoryId });
            else setNav({ screen: "home" });
          }} style={styles.hbtn}><Text style={styles.hbtnTxt}>‹ برگشت</Text></TouchableOpacity>
        ) : <View style={{ width: 70 }} />}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ flexDirection: "row-reverse", gap: 6 }}>
          <TouchableOpacity onPress={() => setNav({ screen: "finance" })} style={styles.hbtn}>
            <Text style={styles.hbtnTxt}>💰 مالی</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exportBackup} style={styles.hbtn}>
            <Text style={styles.hbtnTxt}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
      {nav.screen === "home" && (
        <TextInput
          value={search} onChangeText={setSearch} placeholder="جست‌وجوی دسته..."
          placeholderTextColor={COLORS.muted} style={styles.search}
        />
      )}
      <View style={styles.financeStrip}>
        <Text style={styles.financeTxt}>پرداخت‌شده: {faNum(finance.paid)} تومان</Text>
        <Text style={styles.financeTxt}> • </Text>
        <Text style={styles.financeTxt}>مانده/قسط: {faNum(finance.remain)} تومان</Text>
      </View>
    </View>
  );
}

/* ---------------- Categories ---------------- */
function CategoryScreen({ db, setDb, cats, setNav }) {
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', id?, name}
  const save = () => {
    const name = (modal.name || "").trim();
    if (!name) return Alert.alert("خطا", "نام دسته را وارد کن.");
    if (modal.mode === "add") {
      setDb({ ...db, categories: [...db.categories, { id: uid(), name, createdAt: Date.now() }] });
    } else {
      setDb({ ...db, categories: db.categories.map((c) => c.id === modal.id ? { ...c, name } : c) });
    }
    setModal(null);
  };
  const remove = (id) => {
    Alert.alert("حذف دسته", "زیرمنوها و اقلام داخلش هم حذف می‌شن. مطمئنی؟", [
      { text: "انصراف", style: "cancel" },
      {
        text: "حذف", style: "destructive", onPress: () => {
          const subIds = db.subs.filter((s) => s.categoryId === id).map((s) => s.id);
          setDb({
            categories: db.categories.filter((c) => c.id !== id),
            subs: db.subs.filter((s) => s.categoryId !== id),
            items: db.items.filter((i) => !subIds.includes(i.subId)),
          });
        },
      },
    ]);
  };
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={cats} keyExtractor={(x) => x.id} contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={<Empty text="هنوز دسته‌ای نداری. با دکمه + بساز." />}
        renderItem={({ item }) => {
          const subCount = db.subs.filter((s) => s.categoryId === item.id).length;
          return (
            <TouchableOpacity style={styles.card} onPress={() => setNav({ screen: "subs", categoryId: item.id })}>
              <View style={styles.cardRow}>
                <View style={styles.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>{faNum(subCount)} زیرمنو</Text>
                </View>
                <TouchableOpacity onPress={() => setModal({ mode: "edit", id: item.id, name: item.name })} style={styles.miniBtn}>
                  <Text style={styles.miniTxt}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.miniBtn}>
                  <Text style={styles.miniTxt}>🗑️</Text>
                </TouchableOpacity>
                <Text style={styles.arrow}>‹</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <FAB onPress={() => setModal({ mode: "add", name: "" })} />
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{modal?.mode === "add" ? "دسته جدید" : "ویرایش دسته"}</Text>
            <TextInput value={modal?.name || ""} onChangeText={(t) => setModal({ ...modal, name: t })}
              placeholder="مثلاً آشپزخانه" style={styles.input} placeholderTextColor={COLORS.muted} />
            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setModal(null)} style={styles.btnGhost}><Text style={styles.btnGhostTxt}>انصراف</Text></TouchableOpacity>
              <TouchableOpacity onPress={save} style={styles.btnMain}><Text style={styles.btnMainTxt}>ذخیره</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- Subs ---------------- */
function SubScreen({ db, setDb, nav, setNav }) {
  const [modal, setModal] = useState(null);
  const subs = db.subs.filter((s) => s.categoryId === nav.categoryId);
  const save = () => {
    const name = (modal.name || "").trim();
    if (!name) return Alert.alert("خطا", "نام زیرمنو را وارد کن.");
    if (modal.mode === "add") setDb({ ...db, subs: [...db.subs, { id: uid(), categoryId: nav.categoryId, name }] });
    else setDb({ ...db, subs: db.subs.map((s) => s.id === modal.id ? { ...s, name } : s) });
    setModal(null);
  };
  const remove = (id) => {
    Alert.alert("حذف زیرمنو", "اقلام داخلش هم حذف می‌شن.", [
      { text: "انصراف", style: "cancel" },
      {
        text: "حذف", style: "destructive", onPress: () => setDb({
          ...db,
          subs: db.subs.filter((s) => s.id !== id),
          items: db.items.filter((i) => i.subId !== id),
        }),
      },
    ]);
  };
  return (
    <View style={{ flex: 1 }}>
      <FlatList data={subs} keyExtractor={(x) => x.id} contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={<Empty text="زیرمنویی نیست. مثلاً «ظروف پخت» بساز." />}
        renderItem={({ item }) => {
          const n = db.items.filter((i) => i.subId === item.id).length;
          const bought = db.items.filter((i) => i.subId === item.id && i.status === "bought").length;
          return (
            <TouchableOpacity style={styles.card}
              onPress={() => setNav({ screen: "items", categoryId: nav.categoryId, subId: item.id })}>
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.rose }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>{faNum(bought)} از {faNum(n)} خرید شده</Text>
                </View>
                <TouchableOpacity onPress={() => setModal({ mode: "edit", id: item.id, name: item.name })} style={styles.miniBtn}><Text style={styles.miniTxt}>✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.miniBtn}><Text style={styles.miniTxt}>🗑️</Text></TouchableOpacity>
                <Text style={styles.arrow}>‹</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <FAB onPress={() => setModal({ mode: "add", name: "" })} />
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalBg}><View style={styles.modal}>
          <Text style={styles.modalTitle}>{modal?.mode === "add" ? "زیرمنوی جدید" : "ویرایش زیرمنو"}</Text>
          <TextInput value={modal?.name || ""} onChangeText={(t) => setModal({ ...modal, name: t })}
            placeholder="مثلاً چاقوها" style={styles.input} placeholderTextColor={COLORS.muted} />
          <View style={styles.modalRow}>
            <TouchableOpacity onPress={() => setModal(null)} style={styles.btnGhost}><Text style={styles.btnGhostTxt}>انصراف</Text></TouchableOpacity>
            <TouchableOpacity onPress={save} style={styles.btnMain}><Text style={styles.btnMainTxt}>ذخیره</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

/* ---------------- Items ---------------- */
const blankItem = (subId) => ({
  subId, name: "", photo: null, priority: "normal", status: "not_bought",
  store: "", price: "", paidAmount: "", payMethod: "cash", receipt: null, note: "",
});

function ItemScreen({ db, setDb, nav, setNav }) {
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState(null); // item detail
  let items = db.items.filter((i) => i.subId === nav.subId);
  if (filter !== "all") items = items.filter((i) => i.status === filter);

  const pickImage = async (cb) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("دسترسی لازم است", "اجازه گالری را بده.");
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled && r.assets?.[0]?.uri) cb(r.assets[0].uri);
  };

  const save = () => {
    const name = (modal.name || "").trim();
    if (!name) return Alert.alert("خطا", "نام کالا را وارد کن.");
    const obj = {
      ...modal,
      name,
      price: parsePrice(modal.price),
      paidAmount: modal.paidAmount === "" ? (modal.status === "bought" ? parsePrice(modal.price) : 0) : parsePrice(modal.paidAmount),
    };
    if (modal.id) setDb({ ...db, items: db.items.map((x) => x.id === modal.id ? { ...x, ...obj } : x) });
    else setDb({ ...db, items: [...db.items, { ...obj, id: uid(), createdAt: Date.now() }] });
    setModal(null);
  };

  const remove = (id) => {
    Alert.alert("حذف کالا", "مطمئنی؟", [
      { text: "انصراف", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => setDb({ ...db, items: db.items.filter((x) => x.id !== id) }) },
    ]);
  };

  const cycleStatus = (item) => {
    const next = item.status === "not_bought" ? "buying" : item.status === "buying" ? "bought" : "not_bought";
    const paidAmount = next === "bought" ? Number(item.price || 0) : Number(item.paidAmount || 0);
    setDb({ ...db, items: db.items.map((x) => x.id === item.id ? { ...x, status: next, paidAmount } : x) });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        {[["all", "همه"], ["not_bought", "خرید نشده"], ["buying", "در حال خرید"], ["bought", "خرید شده"]].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[styles.chip, filter === k && styles.chipOn]}>
            <Text style={[styles.chipTxt, filter === k && styles.chipTxtOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={items} keyExtractor={(x) => x.id} contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={<Empty text="هنوز کالایی ثبت نشده. با + اضافه کن." />}
        renderItem={({ item }) => {
          const p = PRIORITY[item.priority] || PRIORITY.normal;
          const s = STATUS[item.status] || STATUS.not_bought;
          return (
            <TouchableOpacity style={styles.itemCard} onPress={() => setView(item)}>
              {item.photo ? <Image source={{ uri: item.photo }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Text>🛒</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={{ flexDirection: "row-reverse", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <View style={[styles.badge, { backgroundColor: p.bg }]}><Text style={[styles.badgeTxt, { color: p.color }]}>{p.label}</Text></View>
                  <TouchableOpacity onPress={() => cycleStatus(item)} style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeTxt, { color: s.color }]}>{s.label} ↻</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSub}>
                  {item.store ? "🏪 " + item.store + " • " : ""}{item.price ? faNum(item.price) + " تومان" : "بدون قیمت"}
                  {item.payMethod ? " • " + (PAY_METHOD[item.payMethod]?.label || "") : ""}
                </Text>
              </View>
              <View>
                <TouchableOpacity onPress={() => setModal({ ...item, price: String(item.price || ""), paidAmount: String(item.paidAmount ?? "") })} style={styles.miniBtn}><Text style={styles.miniTxt}>✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.miniBtn}><Text style={styles.miniTxt}>🗑️</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <FAB onPress={() => setModal({ ...blankItem(nav.subId), id: null })} />

      {/* add/edit modal */}
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalBg}><ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{modal?.id ? "ویرایش کالا" : "کالای جدید"}</Text>
            <Text style={styles.lbl}>نام کالا *</Text>
            <TextInput value={modal?.name || ""} onChangeText={(t) => setModal({ ...modal, name: t })} placeholder="مثلاً سرویس قابلمه" style={styles.input} placeholderTextColor={COLORS.muted} />
            <Text style={styles.lbl}>عکس محصول</Text>
            <View style={{ flexDirection: "row-reverse", gap: 8, alignItems: "center" }}>
              {modal?.photo ? <Image source={{ uri: modal.photo }} style={{ width: 64, height: 64, borderRadius: 12 }} /> : null}
              <TouchableOpacity style={styles.btnGhost} onPress={() => pickImage((uri) => setModal({ ...modal, photo: uri }))}>
                <Text style={styles.btnGhostTxt}>{modal?.photo ? "تعویض عکس" : "📷 انتخاب عکس"}</Text>
              </TouchableOpacity>
              {modal?.photo ? <TouchableOpacity onPress={() => setModal({ ...modal, photo: null })}><Text style={{ color: COLORS.gilasi, fontFamily: "Vazirmatn_500Medium" }}>حذف</Text></TouchableOpacity> : null}
            </View>
            <Text style={styles.lbl}>اولویت</Text>
            <View style={{ flexDirection: "row-reverse", gap: 6 }}>
              {Object.values(PRIORITY).map((o) => (
                <TouchableOpacity key={o.key} onPress={() => setModal({ ...modal, priority: o.key })}
                  style={[styles.chip, modal?.priority === o.key && { backgroundColor: o.color, borderColor: o.color }]}>
                  <Text style={[styles.chipTxt, modal?.priority === o.key && { color: "#fff" }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.lbl}>وضعیت</Text>
            <View style={{ flexDirection: "row-reverse", gap: 6, flexWrap: "wrap" }}>
              {Object.values(STATUS).map((o) => (
                <TouchableOpacity key={o.key} onPress={() => setModal({ ...modal, status: o.key })}
                  style={[styles.chip, modal?.status === o.key && { backgroundColor: o.color, borderColor: o.color }]}>
                  <Text style={[styles.chipTxt, modal?.status === o.key && { color: "#fff" }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.lbl}>فروشگاه</Text>
            <TextInput value={modal?.store || ""} onChangeText={(t) => setModal({ ...modal, store: t })} placeholder="مثلاً بازار، دیجی‌کالا..." style={styles.input} placeholderTextColor={COLORS.muted} />
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>قیمت کل (تومان)</Text>
                <TextInput value={String(modal?.price ?? "")} onChangeText={(t) => setModal({ ...modal, price: t })} keyboardType="numeric" placeholder="۰" style={styles.input} placeholderTextColor={COLORS.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>مبلغ پرداخت‌شده</Text>
                <TextInput value={String(modal?.paidAmount ?? "")} onChangeText={(t) => setModal({ ...modal, paidAmount: t })} keyboardType="numeric" placeholder="۰" style={styles.input} placeholderTextColor={COLORS.muted} />
              </View>
            </View>
            <Text style={styles.lbl}>نحوه خرید</Text>
            <View style={{ flexDirection: "row-reverse", gap: 6, flexWrap: "wrap" }}>
              {Object.values(PAY_METHOD).map((o) => (
                <TouchableOpacity key={o.key} onPress={() => setModal({ ...modal, payMethod: o.key })}
                  style={[styles.chip, modal?.payMethod === o.key && styles.chipOn]}>
                  <Text style={[styles.chipTxt, modal?.payMethod === o.key && styles.chipTxtOn]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.lbl}>رسید خرید</Text>
            <View style={{ flexDirection: "row-reverse", gap: 8, alignItems: "center" }}>
              {modal?.receipt ? <Image source={{ uri: modal.receipt }} style={{ width: 64, height: 64, borderRadius: 12 }} /> : null}
              <TouchableOpacity style={styles.btnGhost} onPress={() => pickImage((uri) => setModal({ ...modal, receipt: uri }))}>
                <Text style={styles.btnGhostTxt}>{modal?.receipt ? "تعویض رسید" : "🧾 بارگذاری رسید"}</Text>
              </TouchableOpacity>
              {modal?.receipt ? <TouchableOpacity onPress={() => setModal({ ...modal, receipt: null })}><Text style={{ color: COLORS.gilasi, fontFamily: "Vazirmatn_500Medium" }}>حذف</Text></TouchableOpacity> : null}
            </View>
            <Text style={styles.lbl}>یادداشت</Text>
            <TextInput value={modal?.note || ""} onChangeText={(t) => setModal({ ...modal, note: t })} placeholder="توضیح اختیاری..." style={[styles.input, { height: 70, textAlignVertical: "top" }]} multiline placeholderTextColor={COLORS.muted} />
            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setModal(null)} style={styles.btnGhost}><Text style={styles.btnGhostTxt}>انصراف</Text></TouchableOpacity>
              <TouchableOpacity onPress={save} style={styles.btnMain}><Text style={styles.btnMainTxt}>ذخیره</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView></View>
      </Modal>

      {/* detail modal */}
      <Modal visible={!!view} transparent animationType="fade">
        <View style={styles.modalBg}><View style={styles.modal}>
          {view?.photo ? <Image source={{ uri: view.photo }} style={{ width: "100%", height: 180, borderRadius: 14, marginBottom: 10 }} /> : null}
          <Text style={styles.modalTitle}>{view?.name}</Text>
          <Text style={styles.font}>فروشگاه: {view?.store || "—"}</Text>
          <Text style={styles.font}>قیمت: {view?.price ? faNum(view.price) + " تومان" : "—"}</Text>
          <Text style={styles.font}>پرداخت‌شده: {faNum(view?.paidAmount || 0)} تومان</Text>
          <Text style={styles.font}>نحوه خرید: {PAY_METHOD[view?.payMethod]?.label || "—"}</Text>
          <Text style={styles.font}>اولویت: {PRIORITY[view?.priority]?.label || "—"} • وضعیت: {STATUS[view?.status]?.label || "—"}</Text>
          {view?.note ? <Text style={styles.font}>📝 {view.note}</Text> : null}
          {view?.receipt ? <Image source={{ uri: view.receipt }} style={{ width: "100%", height: 220, borderRadius: 14, marginTop: 10 }} resizeMode="contain" /> : <Text style={styles.font}>🧾 رسیدی ثبت نشده</Text>}
          <TouchableOpacity onPress={() => setView(null)} style={[styles.btnMain, { marginTop: 14 }]}><Text style={styles.btnMainTxt}>بستن</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

/* ---------------- Finance ---------------- */
function FinanceScreen({ db, finance }) {
  const pct = finance.total ? Math.round((finance.paid / finance.total) * 100) : 0;
  const debts = db.items.filter((i) => Number(i.price || 0) - Number(i.paidAmount || 0) > 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      <View style={styles.sumCard}>
        <Text style={styles.sumTitle}>💰 خلاصه مالی (تومان)</Text>
        <View style={styles.sumRow}><Text style={styles.font}>جمع کل خریدها</Text><Text style={styles.fontBold}>{faNum(finance.total)}</Text></View>
        <View style={styles.sumRow}><Text style={styles.font}>تا الان پرداخت شده</Text><Text style={[styles.fontBold, { color: COLORS.success }]}>{faNum(finance.paid)}</Text></View>
        <View style={styles.sumRow}><Text style={styles.font}>مانده / قسط باقی‌مانده</Text><Text style={[styles.fontBold, { color: COLORS.gilasi }]}>{faNum(finance.remain)}</Text></View>
        <View style={styles.progressBg}><View style={[styles.progressFg, { width: `${pct}%` }]} /></View>
        <Text style={styles.font}>{faNum(pct)}٪ پرداخت شده</Text>
      </View>
      <View style={styles.sumCard}>
        <Text style={styles.sumTitle}>تفکیک نحوه خرید</Text>
        {Object.values(PAY_METHOD).map((m) => (
          <View key={m.key} style={styles.sumRow}>
            <Text style={styles.font}>{m.label}</Text>
            <Text style={styles.fontBold}>{faNum(finance.byMethod[m.key] || 0)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.sumCard}>
        <Text style={styles.sumTitle}>اقساط و بدهی‌ها ({faNum(debts.length)} قلم)</Text>
        {debts.length === 0 ? <Text style={styles.font}>🎉 بدهی نداری!</Text> :
          debts.map((d) => (
            <View key={d.id} style={styles.sumRow}>
              <Text style={[styles.font, { flex: 1 }]}>{d.name}</Text>
              <Text style={styles.fontBold}>{faNum(Number(d.price) - Number(d.paidAmount || 0))}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

function Empty({ text }) {
  return <View style={styles.center}><Text style={styles.font}>{text}</Text></View>;
}
function FAB({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.fab}><Text style={{ color: "#fff", fontSize: 28, marginTop: -3 }}>+</Text></TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.shiri },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: COLORS.shiri },
  font: { fontFamily: "Vazirmatn_400Regular", color: COLORS.text, textAlign: "right", writingDirection: "rtl" },
  fontBold: { fontFamily: "Vazirmatn_700Bold", color: COLORS.text },
  header: { backgroundColor: COLORS.zershki, paddingTop: 44, paddingBottom: 10, paddingHorizontal: 12, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontFamily: "Vazirmatn_700Bold", color: "#fff", fontSize: 18 },
  hbtn: { backgroundColor: "rgba(255,255,255,.16)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  hbtnTxt: { color: "#fff", fontFamily: "Vazirmatn_500Medium", fontSize: 13 },
  search: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10, fontFamily: "Vazirmatn_400Regular", textAlign: "right", color: COLORS.text },
  financeStrip: { flexDirection: "row-reverse", marginTop: 8 },
  financeTxt: { color: COLORS.pastel, fontFamily: "Vazirmatn_500Medium", fontSize: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  cardTitle: { fontFamily: "Vazirmatn_700Bold", color: COLORS.text, fontSize: 16, textAlign: "right" },
  cardSub: { fontFamily: "Vazirmatn_400Regular", color: COLORS.muted, fontSize: 12, textAlign: "right", marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.gilasi },
  arrow: { color: COLORS.muted, fontSize: 22 },
  miniBtn: { padding: 6 },
  miniTxt: { fontSize: 16 },
  itemCard: { backgroundColor: "#fff", borderRadius: 16, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row-reverse", gap: 10, alignItems: "center" },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbEmpty: { backgroundColor: COLORS.pastel, alignItems: "center", justifyContent: "center" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontFamily: "Vazirmatn_500Medium", fontSize: 11 },
  filters: { flexDirection: "row-reverse", gap: 6, padding: 12, paddingBottom: 0, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: COLORS.gilasi, borderColor: COLORS.gilasi },
  chipTxt: { fontFamily: "Vazirmatn_500Medium", fontSize: 12, color: COLORS.text },
  chipTxtOn: { color: "#fff" },
  fab: { position: "absolute", bottom: 22, left: 22, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.gilasi, alignItems: "center", justifyContent: "center", elevation: 4 },
  modalBg: { flex: 1, backgroundColor: "rgba(60,10,20,.45)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  modalTitle: { fontFamily: "Vazirmatn_700Bold", fontSize: 17, color: COLORS.zershki, textAlign: "right", marginBottom: 10 },
  lbl: { fontFamily: "Vazirmatn_500Medium", color: COLORS.text, textAlign: "right", marginTop: 10, marginBottom: 4, fontSize: 13 },
  input: { backgroundColor: COLORS.shiri, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontFamily: "Vazirmatn_400Regular", textAlign: "right", color: COLORS.text },
  modalRow: { flexDirection: "row-reverse", gap: 8, marginTop: 16 },
  btnMain: { flex: 1, backgroundColor: COLORS.gilasi, borderRadius: 12, padding: 12, alignItems: "center" },
  btnMainTxt: { color: "#fff", fontFamily: "Vazirmatn_700Bold" },
  btnGhost: { flex: 1, backgroundColor: COLORS.pastel, borderRadius: 12, padding: 12, alignItems: "center" },
  btnGhostTxt: { color: COLORS.zershki, fontFamily: "Vazirmatn_500Medium" },
  sumCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  sumTitle: { fontFamily: "Vazirmatn_700Bold", color: COLORS.zershki, textAlign: "right", marginBottom: 8 },
  sumRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 4 },
  progressBg: { height: 10, backgroundColor: "#F1E2E6", borderRadius: 5, marginVertical: 8, overflow: "hidden" },
  progressFg: { height: 10, backgroundColor: COLORS.gilasi },
});
