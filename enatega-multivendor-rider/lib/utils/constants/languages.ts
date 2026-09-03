/* eslint-disable @typescript-eslint/no-require-imports */
// Launch scope is English + Hindi only. Other locale files still ship in the
// repo but are intentionally not offered in the picker.
export const LANGUAGES = [
  {
    icon: require("@/lib/assets/images/eng-flag.png"),
    value: "English",
    code: "en",
  },
  {
    icon: require("@/lib/assets/images/eng-flag.png"),
    value: "हिंदी",
    code: "hi",
  },
];
