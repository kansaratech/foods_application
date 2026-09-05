// Core
import { Formik } from "formik";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

// React Native
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Icon
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";

// Schemas
import { RiderRegisterSchema } from "@/lib/utils/schema";
import { useTranslation } from "react-i18next";

// Hooks
import useRiderRegister from "@/lib/hooks/useRiderRegister";

// Interface
import { useApptheme } from "@/lib/context/global/theme.context";
import { router } from "expo-router";
import CustomContinueButton from "../../useable-components/custom-continue-button";
import CustomRadioButton from "../../useable-components/custom-radio-button";

const VEHICLE_OPTIONS: { code: string; label: string }[] = [
  { code: "bicycle", label: "Bicycle" },
  { code: "motorbike", label: "Motorbike" },
  { code: "car", label: "Car" },
  { code: "pickup_truck", label: "Pickup truck" },
];

interface IRegisterFormValues {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  vehicleNumber: string;
}

const initialValues: IRegisterFormValues = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  vehicleNumber: "",
};

const RegisterScreen = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [vehicleType, setVehicleType] = useState("bicycle");

  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { onRegister, isRegistering } = useRiderRegister();

  const onSubmit = async (values: IRegisterFormValues) => {
    await onRegister({
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      password: values.password,
      vehicleType,
      vehicleNumber: values.vehicleNumber || undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ backgroundColor: appTheme.themeBackground }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false}>
          <Formik
            initialValues={initialValues}
            validationSchema={RiderRegisterSchema}
            onSubmit={onSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View className="mt-16 p-5 items-center justify-between gap-y-2">
                <FontAwesome name="motorcycle" size={30} color={appTheme.fontMainColor} />

                <Text
                  className="text-center text-xl font-semibold"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {t("Register as a rider")}
                </Text>
                <Text
                  className="text-center text-sm mb-3"
                  style={{ color: appTheme.fontSecondColor }}
                >
                  {t("Your account will need admin approval before you can go online")}
                </Text>

                {/* Name */}
                <View
                  className="w-full flex-row items-center border rounded-lg px-3 mb-[-4]"
                  style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.themeBackground }}
                >
                  <TextInput
                    className="flex-1 h-12 text-base"
                    style={{ color: appTheme.fontMainColor }}
                    placeholder={t("Full name")}
                    placeholderTextColor={appTheme.fontSecondColor}
                    value={values.name}
                    onChangeText={handleChange("name")}
                    onBlur={handleBlur("name")}
                  />
                </View>
                {errors.name && touched.name && (
                  <Text className="mb-2 text-sm text-red-500">{errors.name}</Text>
                )}

                {/* Phone */}
                <View
                  className="w-full flex-row items-center border rounded-lg px-3 mb-[-4]"
                  style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.themeBackground }}
                >
                  <TextInput
                    className="flex-1 h-12 text-base"
                    style={{ color: appTheme.fontMainColor }}
                    placeholder={t("Phone number")}
                    placeholderTextColor={appTheme.fontSecondColor}
                    keyboardType="phone-pad"
                    value={values.phone}
                    onChangeText={handleChange("phone")}
                    onBlur={handleBlur("phone")}
                  />
                </View>
                {errors.phone && touched.phone && (
                  <Text className="mb-2 text-sm text-red-500">{errors.phone}</Text>
                )}

                {/* Email (optional) */}
                <View
                  className="w-full flex-row items-center border rounded-lg px-3 mb-[-4]"
                  style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.themeBackground }}
                >
                  <TextInput
                    className="flex-1 h-12 text-base"
                    style={{ color: appTheme.fontMainColor }}
                    placeholder={t("Email (optional)")}
                    placeholderTextColor={appTheme.fontSecondColor}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={values.email}
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                  />
                </View>
                {errors.email && touched.email && (
                  <Text className="mb-2 text-sm text-red-500">{errors.email}</Text>
                )}

                {/* Password */}
                <View
                  className="w-full flex-row items-center border rounded-lg px-3 mb-[-4]"
                  style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.themeBackground }}
                >
                  <TextInput
                    className="flex-1 h-12 text-base"
                    style={{ color: appTheme.fontMainColor }}
                    placeholder={t("Password")}
                    placeholderTextColor={appTheme.fontSecondColor}
                    secureTextEntry={!passwordVisible}
                    value={values.password}
                    onChangeText={handleChange("password")}
                    onBlur={handleBlur("password")}
                  />
                  <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} className="ml-2">
                    <FontAwesome6
                      name={passwordVisible ? "eye-slash" : "eye"}
                      size={14}
                      color={appTheme.fontMainColor}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && touched.password && (
                  <Text className="mb-2 text-sm text-red-500">{errors.password}</Text>
                )}

                {/* Confirm password */}
                <View
                  className="w-full flex-row items-center border rounded-lg px-3 mb-[-4]"
                  style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.themeBackground }}
                >
                  <TextInput
                    className="flex-1 h-12 text-base"
                    style={{ color: appTheme.fontMainColor }}
                    placeholder={t("Confirm password")}
                    placeholderTextColor={appTheme.fontSecondColor}
                    secureTextEntry={!passwordVisible}
                    value={values.confirmPassword}
                    onChangeText={handleChange("confirmPassword")}
                    onBlur={handleBlur("confirmPassword")}
                  />
                </View>
                {errors.confirmPassword && touched.confirmPassword && (
                  <Text className="mb-2 text-sm text-red-500">{errors.confirmPassword}</Text>
                )}

                {/* Vehicle type */}
                <Text
                  className="self-start mt-2 mb-1 text-sm font-medium"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {t("Vehicle type")}
                </Text>
                <View className="w-full flex-row flex-wrap gap-4 mb-2">
                  {VEHICLE_OPTIONS.map((opt) => (
                    <CustomRadioButton
                      key={opt.code}
                      label={t(opt.label)}
                      showLabel
                      isSelected={vehicleType === opt.code}
                      onPress={() => setVehicleType(opt.code)}
                    />
                  ))}
                </View>

                {/* Vehicle number (optional) */}
                <View
                  className="w-full flex-row items-center border rounded-lg px-3 mb-[-4]"
                  style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.themeBackground }}
                >
                  <TextInput
                    className="flex-1 h-12 text-base"
                    style={{ color: appTheme.fontMainColor }}
                    placeholder={t("Vehicle number (optional)")}
                    placeholderTextColor={appTheme.fontSecondColor}
                    autoCapitalize="characters"
                    value={values.vehicleNumber}
                    onChangeText={handleChange("vehicleNumber")}
                    onBlur={handleBlur("vehicleNumber")}
                  />
                </View>

                <CustomContinueButton
                  title={isRegistering ? t("Registering...") : t("Register")}
                  onPress={() => handleSubmit()}
                  disabled={isRegistering}
                  className="self-center"
                />

                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                  <Text className="text-center text-sm" style={{ color: appTheme.primary }}>
                    {t("Already have an account? Log in")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
