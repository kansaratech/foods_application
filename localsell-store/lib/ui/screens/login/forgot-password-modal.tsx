import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome6";
import { ApolloError, useMutation } from "@apollo/client";

import {
  FORGOT_PASSWORD,
  RESET_PASSWORD,
} from "@/lib/apollo/mutations/forgot-password.mutation";
import { useApptheme } from "@/lib/context/theme.context";
import { FlashMessageComponent } from "@/lib/ui/useable-components";

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-fill if the login field already looks like an email. */
  initialEmail?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const strongEnough = (pw: string) =>
  pw.length >= 8 &&
  /[a-z]/.test(pw) &&
  /[A-Z]/.test(pw) &&
  /\d/.test(pw) &&
  /[^A-Za-z0-9\s]/.test(pw);

export default function ForgotPasswordModal({
  visible,
  onClose,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const { appTheme } = useApptheme();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [forgotPassword, { loading: sending }] = useMutation(FORGOT_PASSWORD);
  const [resetPassword, { loading: resetting }] = useMutation(RESET_PASSWORD);

  const reset = () => {
    setStep("request");
    setOtp("");
    setPassword("");
    setConfirm("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const apolloMessage = (err: unknown) =>
    (err as ApolloError)?.graphQLErrors?.[0]?.message ||
    (err as Error)?.message ||
    "Something went wrong. Please try again.";

  const requestOtp = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      FlashMessageComponent({ message: "Enter the email on your store account." });
      return;
    }
    try {
      await forgotPassword({ variables: { email: email.trim().toLowerCase() } });
      FlashMessageComponent({
        message: "We sent a reset code to your email.",
      });
      setStep("reset");
    } catch (err) {
      FlashMessageComponent({ message: apolloMessage(err) });
    }
  };

  const submitReset = async () => {
    if (!otp.trim()) {
      FlashMessageComponent({ message: "Enter the code from your email." });
      return;
    }
    if (!strongEnough(password)) {
      FlashMessageComponent({
        message:
          "Password needs 8+ chars with an uppercase, lowercase, number and symbol.",
      });
      return;
    }
    if (password !== confirm) {
      FlashMessageComponent({ message: "The two passwords do not match." });
      return;
    }
    try {
      await resetPassword({
        variables: {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          password,
        },
      });
      FlashMessageComponent({
        message: "Password updated. Please sign in.",
      });
      close();
    } catch (err) {
      FlashMessageComponent({ message: apolloMessage(err) });
    }
  };

  const fieldStyle = {
    backgroundColor: appTheme.cartContainer,
    borderColor: appTheme.borderLineColor,
    color: appTheme.fontMainColor,
  };
  const busy = sending || resetting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <Pressable
        onPress={close}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: appTheme.themeBackground,
            borderRadius: 20,
            padding: 22,
            gap: 14,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text
              className="text-lg font-bold"
              style={{ color: appTheme.fontMainColor }}
            >
              {step === "request" ? "Reset password" : "Enter reset code"}
            </Text>
            <TouchableOpacity onPress={close} accessibilityLabel="Close">
              <Icon name="xmark" size={18} color={appTheme.fontSecondColor} />
            </TouchableOpacity>
          </View>

          <Text className="text-sm" style={{ color: appTheme.fontSecondColor }}>
            {step === "request"
              ? "We’ll email you a one-time code to set a new password."
              : `Code sent to ${email}. It expires in 10 minutes.`}
          </Text>

          {step === "request" ? (
            <TextInput
              className="h-12 rounded-xl border px-4 text-base"
              style={fieldStyle}
              placeholder="Account email"
              placeholderTextColor={appTheme.fontSecondColor}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          ) : (
            <>
              <TextInput
                className="h-12 rounded-xl border px-4 text-base"
                style={fieldStyle}
                placeholder="6-digit code"
                placeholderTextColor={appTheme.fontSecondColor}
                keyboardType="number-pad"
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              />
              <TextInput
                className="h-12 rounded-xl border px-4 text-base"
                style={fieldStyle}
                placeholder="New password"
                placeholderTextColor={appTheme.fontSecondColor}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                className="h-12 rounded-xl border px-4 text-base"
                style={fieldStyle}
                placeholder="Confirm new password"
                placeholderTextColor={appTheme.fontSecondColor}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
            </>
          )}

          <TouchableOpacity
            disabled={busy}
            onPress={step === "request" ? requestOtp : submitReset}
            style={{
              backgroundColor: appTheme.primary,
              borderRadius: 12,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">
                {step === "request" ? "Send reset code" : "Set new password"}
              </Text>
            )}
          </TouchableOpacity>

          {step === "reset" && (
            <TouchableOpacity onPress={requestOtp} disabled={sending}>
              <Text
                className="text-center text-sm"
                style={{ color: appTheme.fontSecondColor }}
              >
                Resend code
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
