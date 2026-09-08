

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: '../../assets/icon.png',
  name: "orderActivity",
  bundleIdentifier: "in.localsell.customer.orderActivity",
  deploymentTarget: "16.2",

  entitlements: {
    "com.apple.security.application-groups": [
      "group.in.localsell.customer.shared"
    ],
  },

  frameworks: ["SwiftUI", "ActivityKit"],
});
