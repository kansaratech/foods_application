import { Formik } from "formik";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome6";
import { SignInSchema } from "@/lib/utils/schema";
import useLogin from "@/lib/hooks/useLogin";
import { useApptheme } from "@/lib/context/theme.context";
import { ILoginInitialValues } from "@/lib/utils/interfaces";
import { useTranslation } from "react-i18next";
import { CustomContinueButton } from "../../useable-components";
import { IMAGES } from "@/lib/assets/images";

const initial: ILoginInitialValues = {
  username: "dgh-shrinath-mishthan-bhandar@store.padharo",
  password: "Store@123",
};

const LoginScreen = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { isLogging, onLogin } = useLogin();

  const onLoginHandler = async (creds: ILoginInitialValues) => {
    await onLogin(creds.username.trim(), creds.password);
  };

  const inputContainer = (hasError: boolean) => ({
    backgroundColor: appTheme.cartContainer,
    borderColor: hasError ? appTheme.textErrorColor : appTheme.borderLineColor,
  });

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: appTheme.themeBackground }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="flex-1 flex-row">
            {isDesktop && (
              <View
                className="w-1/2 min-h-screen px-16 py-14 justify-between overflow-hidden"
                style={{ backgroundColor: "#8F173F" }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 rounded-2xl bg-[#FF8508] items-center justify-center">
                    <Image source={IMAGES.icon} className="h-10 w-10 rounded-xl" />
                  </View>
                  <View>
                    <Text className="text-white text-2xl font-bold">Padharo</Text>
                    <Text className="text-white/70 text-xs tracking-widest uppercase">
                      Merchant Hub
                    </Text>
                  </View>
                </View>

                <View className="max-w-xl">
                  <View className="self-start rounded-full bg-white/10 px-4 py-2 mb-6">
                    <Text className="text-[#FFD9A7] text-sm font-semibold">
                      Everything your store needs
                    </Text>
                  </View>
                  <Text className="text-white text-5xl font-bold leading-tight">
                    Run your kitchen.{"\n"}Grow your business.
                  </Text>
                  <Text className="text-white/75 text-lg leading-7 mt-5 max-w-lg">
                    Manage live orders, menus, earnings and payouts from one calm,
                    focused workspace.
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  {["Live orders", "Menu control", "Fast payouts"].map((item) => (
                    <View key={item} className="rounded-xl bg-white/10 px-4 py-3">
                      <Text className="text-white font-medium">{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View className="flex-1 items-center justify-center px-5 py-10">
              <View className="w-full max-w-md">
                {!isDesktop && (
                  <View className="items-center mb-9">
                    <Image source={IMAGES.icon} className="h-20 w-20 rounded-3xl" />
                    <Text
                      className="text-2xl font-bold mt-3"
                      style={{ color: appTheme.fontMainColor }}
                    >
                      Padharo Merchant
                    </Text>
                  </View>
                )}

                <Text
                  className="text-3xl font-bold"
                  style={{ color: appTheme.fontMainColor }}
                >
                  Welcome back
                </Text>
                <Text
                  className="text-base mt-2 mb-8 leading-6"
                  style={{ color: appTheme.fontSecondColor }}
                >
                  Sign in to manage your restaurant and today&apos;s orders.
                </Text>

                <Formik
                  initialValues={initial}
                  validationSchema={SignInSchema}
                  onSubmit={onLoginHandler}
                >
                  {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                    <View className="gap-y-5">
                      <View>
                        <Text
                          className="text-sm font-semibold mb-2"
                          style={{ color: appTheme.fontMainColor }}
                        >
                          Email or username
                        </Text>
                        <View
                          className="h-14 flex-row items-center border rounded-2xl px-4"
                          style={inputContainer(!!(touched.username && errors.username))}
                        >
                          <Icon name="envelope" size={16} color={appTheme.fontSecondColor} />
                          <TextInput
                            className="flex-1 h-full ml-3 text-base outline-none"
                            style={{ color: appTheme.fontMainColor }}
                            placeholder={t("Username or Email")}
                            placeholderTextColor={appTheme.fontSecondColor}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            value={values.username}
                            onChangeText={handleChange("username")}
                            onBlur={handleBlur("username")}
                          />
                        </View>
                        {touched.username && errors.username && (
                          <Text className="text-sm mt-2" style={{ color: appTheme.textErrorColor }}>
                            {errors.username}
                          </Text>
                        )}
                      </View>

                      <View>
                        <Text
                          className="text-sm font-semibold mb-2"
                          style={{ color: appTheme.fontMainColor }}
                        >
                          Password
                        </Text>
                        <View
                          className="h-14 flex-row items-center border rounded-2xl px-4"
                          style={inputContainer(!!(touched.password && errors.password))}
                        >
                          <Icon name="lock" size={16} color={appTheme.fontSecondColor} />
                          <TextInput
                            className="flex-1 h-full ml-3 text-base outline-none"
                            style={{ color: appTheme.fontMainColor }}
                            placeholder={t("Password")}
                            placeholderTextColor={appTheme.fontSecondColor}
                            secureTextEntry={!passwordVisible}
                            value={values.password}
                            onChangeText={handleChange("password")}
                            onBlur={handleBlur("password")}
                            onSubmitEditing={() => handleSubmit()}
                          />
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                            onPress={() => setPasswordVisible((visible) => !visible)}
                            className="h-10 w-10 items-center justify-center"
                          >
                            <Icon
                              name={passwordVisible ? "eye-slash" : "eye"}
                              size={16}
                              color={appTheme.fontSecondColor}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.password && errors.password && (
                          <Text className="text-sm mt-2" style={{ color: appTheme.textErrorColor }}>
                            {errors.password}
                          </Text>
                        )}
                      </View>

                      <CustomContinueButton
                        title={t("Login")}
                        disabled={isLogging}
                        isLoading={isLogging}
                        onPress={() => handleSubmit()}
                      />

                      <View
                        className="flex-row items-start rounded-2xl px-4 py-3 mt-1"
                        style={{ backgroundColor: appTheme.lowOpacityPrimaryColor }}
                      >
                        <Icon name="circle-info" size={15} color={appTheme.primary} />
                        <Text
                          className="flex-1 text-xs leading-5 ml-3"
                          style={{ color: appTheme.fontSecondColor }}
                        >
                          Demo access is pre-filled. Select Sign in to explore the merchant dashboard.
                        </Text>
                      </View>
                    </View>
                  )}
                </Formik>

                <Text
                  className="text-center text-xs mt-9"
                  style={{ color: appTheme.fontSecondColor }}
                >
                  Need help? Contact your Padharo account manager.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
