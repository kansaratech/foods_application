import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useAcceptOrder from "@/lib/hooks/useAcceptOrder";
import useOrderRing from "@/lib/hooks/useOrderRing";
import { useSoundContext } from "@/lib/context/global/sound.context";
import { IOrder } from "@/lib/utils/interfaces/order.interface";

const TIMES = [10, 20, 30, 40, 50, 60];
const BLUE = "#1559e9";

// Web-only presentation. Native orders retain their existing sheet and printing.
export default function PreparationTimeDialog({
  order,
  onClose,
}: {
  order: IOrder;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { acceptOrder } = useAcceptOrder();
  const { muteRing } = useOrderRing();
  const { silenceRing } = useSoundContext();
  const [selected, setSelected] = useState(10);
  const [custom, setCustom] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const minutes = custom ? Number(customTime) : selected;
  const valid =
    (!custom || /^\d+$/.test(customTime)) &&
    Number.isSafeInteger(minutes) &&
    minutes > 0 &&
    minutes <= 1440;
  const close = () => {
    if (!submitting.current) onClose();
  };
  const accept = async () => {
    if (!valid || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await acceptOrder(order._id, String(minutes));
    } catch {
      setError(t("Failed to accept order. Please try again."));
      submitting.current = false;
      setBusy(false);
      return;
    }
    void silenceRing().catch(() => {});
    void muteRing(order.orderId).catch(() => {});
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("Close preparation time dialog")}
          disabled={busy}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                {t("Set preparation time")}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Close")}
                disabled={busy}
                onPress={close}
                style={styles.close}
              >
                <Ionicons name="close" size={22} color="#172b4d" />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              {order.isPickedUp
                ? t("How long will this pickup order take?")
                : t("How long will this delivery order take?")}
            </Text>
            <View style={styles.grid}>
              {TIMES.map((time) => (
                <Pressable
                  key={time}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: !custom && selected === time,
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() => {
                    setSelected(time);
                    setCustom(false);
                  }}
                  style={[
                    styles.preset,
                    !custom && selected === time && styles.active,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      !custom && selected === time && styles.white,
                    ]}
                  >
                    {t("{{count}} min", { count: time })}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: custom }}
              disabled={busy}
              onPress={() => setCustom(!custom)}
              style={styles.custom}
            >
              <Ionicons name="add" size={20} color={BLUE} />
              <Text style={styles.blueText}>{t("Custom time")}</Text>
            </Pressable>
            {custom && (
              <View style={styles.customField}>
                <Text style={styles.buttonText}>
                  {t("Preparation time (minutes)")}
                </Text>
                <TextInput
                  autoFocus
                  accessibilityLabel={t("Preparation time in minutes")}
                  editable={!busy}
                  keyboardType="number-pad"
                  value={customTime}
                  onChangeText={setCustomTime}
                  placeholder="e.g. 25"
                  maxLength={4}
                  style={styles.input}
                  onSubmitEditing={() => void accept()}
                />
                {!valid && (
                  <Text style={styles.error}>
                    {t("Enter a whole number from 1 to 1440 minutes.")}
                  </Text>
                )}
              </View>
            )}
            <View style={styles.notice}>
              <Ionicons name="time-outline" size={18} color="#7b8dad" />
              <Text style={styles.noticeText}>
                {t("Customer will see the estimated ready time.")}
              </Text>
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={close}
                style={styles.cancel}
              >
                <Text style={styles.blueText}>{t("Cancel")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !valid, busy }}
                disabled={busy || !valid}
                onPress={() => void accept()}
                style={[styles.accept, (busy || !valid) && styles.disabled]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.buttonText, styles.white]}>
                    {valid
                      ? t("Accept order · Ready in {{count}} min", {
                          count: minutes,
                        })
                      : t("Accept order")}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(24, 43, 70, 0.45)",
  },
  dialog: {
    width: "100%",
    maxWidth: 428,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#172b4d",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    overflow: "hidden",
  },
  content: { padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#10203e", flex: 1 },
  close: { padding: 4 },
  subtitle: { fontSize: 14, color: "#7283a3", marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  preset: {
    width: "30%",
    flexGrow: 1,
    minHeight: 43,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#d5deed",
  },
  active: { backgroundColor: BLUE, borderColor: BLUE },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#172440",
    textAlign: "center",
  },
  white: { color: "#fff" },
  blueText: { fontSize: 13, fontWeight: "600", color: BLUE },
  custom: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#5684ff",
    borderRadius: 7,
    marginTop: 12,
  },
  customField: { gap: 8, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#aebfdd",
    borderRadius: 7,
    padding: 10,
    fontSize: 14,
    color: "#172440",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    marginBottom: 24,
  },
  noticeText: { color: "#7283a3", fontSize: 12, flex: 1 },
  error: { color: "#b42318", fontSize: 12, marginBottom: 8 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#dce3ee",
    paddingTop: 17,
  },
  cancel: {
    minHeight: 44,
    flexGrow: 1,
    flexBasis: 110,
    borderWidth: 1,
    borderColor: "#5684ff",
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  accept: {
    minHeight: 44,
    flexGrow: 2,
    flexBasis: 225,
    paddingHorizontal: 12,
    backgroundColor: BLUE,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: { opacity: 0.55 },
});
