/* eslint-disable @typescript-eslint/no-require-imports */
// Web stub for `react-native-maps` (which imports native-only modules and cannot
// build for web). The rider app is primarily a native app; on web we just render
// a placeholder where the live-tracking map would be. Wired in via
// `metro.config.js` -> `resolver.resolveRequest` for `platform === "web"`.
const React = require("react");
const { View, Text } = require("react-native");

const MapView = React.forwardRef(function MapViewWebStub(props, ref) {
  return React.createElement(
    View,
    {
      ref,
      ...props,
      style: [
        { alignItems: "center", justifyContent: "center", backgroundColor: "#EDEFF2" },
        props.style,
      ],
    },
    React.createElement(
      Text,
      { style: { color: "#8A8F98", fontSize: 13, padding: 16, textAlign: "center" } },
      "Live map is available in the rider mobile app.",
    ),
    props.children,
  );
});

const Passthrough = (props) =>
  React.createElement(View, props, props && props.children);

const Marker = Passthrough;
Marker.Animated = Passthrough;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.MarkerAnimated = Passthrough;
module.exports.Callout = Passthrough;
module.exports.Polyline = Passthrough;
module.exports.Polygon = Passthrough;
module.exports.Circle = Passthrough;
module.exports.Overlay = Passthrough;
module.exports.PROVIDER_DEFAULT = undefined;
module.exports.PROVIDER_GOOGLE = "google";
