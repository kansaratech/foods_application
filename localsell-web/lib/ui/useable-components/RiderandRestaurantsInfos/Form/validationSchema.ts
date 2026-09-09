import * as Yup from "yup";
import { isValidEmail } from "@/lib/utils/methods/validation";

const emailValidationSchema = (t: (key: string) => string) =>
  Yup.object({
    firstName: Yup.string().required(t("firstNameRequired")),
    lastName: Yup.string().required(t("lastNameRequired")),
    phoneNumber: Yup.string()
      // 10-digit Indian mobile, with or without the +91 country code prefix.
      .matches(/^(\+?91)?[6-9][0-9]{9}$/, t("phoneNumberInvalid"))
      .required(t("phoneNumberRequired")),
    email: Yup.string()
      .trim()
      // Shared rule with the customer site — rejects "x@com" / "x@gmailcom".
      .test("valid-email", t("emailInvalid"), (value) => isValidEmail(value))
      .required(t("emailRequired")),
    termsAccepted: Yup.boolean().oneOf([true], t("termsRequired")),
  });

export default emailValidationSchema;
