import CustomSpinner from "@/lib/ui/useable-components/custom-spinner";
import { useState } from "react";
import {
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
import useCancelOrder from "@/lib/hooks/useCancelOrder";
import { IOrder } from "@/lib/utils/interfaces/order.interface";

const BLUE = "#1559e9";
const OTHER = "__other__";

// Web-only presentation, mirrors preparation-time-dialog. Native orders keep
// their existing sheet. Cancellation must always carry a real, specific
// reason — the customer and admin both see it later — so this replaces the
// old single-tap "cancel" that silently sent "not available" every time.
export default function RejectOrderDialog({
  order,
  onClose,
}: {
  order: IOrder;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { cancelOrder } = useCancelOrder();
  const REASONS = [
    t("Item out of stock"),
    t("Store too busy right now"),
    t("Cannot fulfill this order"),
    t("Wrong order details"),
  ];
  const [selected, setSelected] = useState("");
  const [customText, setCustomText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isOther = selected === OTHER;
  const finalReason = isOther ? customText.trim() : selected;
  const valid = finalReason.length >= 5;
  const close = () => {
    if (!busy) onClose();
  };
  const confirm = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await cancelOrder(order._id, finalReason);
    } catch {
      setError(t("Failed to cancel order. Please try again."));
      setBusy(false);
      return;
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("Close cancel order dialog")}
          disabled={busy}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                {t("Cancel order")}
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
              {t(
                "The customer will see this reason, and it's kept on record — please be specific.",
              )}
            </Text>
            <View style={styles.list}>
              {REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: selected === reason,
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() => setSelected(reason)}
                  style={[styles.preset, selected === reason && styles.active]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      selected === reason && styles.white,
                    ]}
                  >
                    {reason}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isOther, disabled: busy }}
                disabled={busy}
                onPress={() => setSelected(OTHER)}
                style={[styles.preset, isOther && styles.active]}
              >
                <Text style={[styles.buttonText, isOther && styles.white]}>
                  {t("Other")}
                </Text>
              </Pressable>
            </View>
            {isOther && (
              <View style={styles.customField}>
                <Text style={styles.buttonText}>{t("Reason")}</Text>
                <TextInput
                  autoFocus
                  accessibilityLabel={t("Cancellation reason")}
                  editable={!busy}
                  value={customText}
                  onChangeText={setCustomText}
                  placeholder={t("e.g. Ran out of ingredients for this item")}
                  multiline
                  style={styles.input}
                />
                {!valid && (
                  <Text style={styles.error}>
                    {t("Enter at least 5 characters.")}
                  </Text>
                )}
              </View>
            )}
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
                <Text style={styles.blueText}>{t("Back")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !valid, busy }}
                disabled={busy || !valid}
                onPress={() => void confirm()}
                style={[styles.accept, (busy || !valid) && styles.disabled]}
              >
                {busy ? (
                  <CustomSpinner color="#fff" />
                ) : (
                  <Text style={[styles.buttonText, styles.white]}>
                    {t("Cancel order")}
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
  list: { gap: 10 },
  preset: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#d5deed",
  },
  active: { backgroundColor: BLUE, borderColor: BLUE },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#172440",
  },
  white: { color: "#fff" },
  blueText: { fontSize: 13, fontWeight: "600", color: BLUE },
  customField: { gap: 8, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#aebfdd",
    borderRadius: 7,
    padding: 10,
    fontSize: 14,
    color: "#172440",
    minHeight: 70,
    textAlignVertical: "top",
  },
  error: { color: "#b42318", fontSize: 12, marginTop: 4, marginBottom: 8 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#dce3ee",
    paddingTop: 17,
    marginTop: 18,
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
