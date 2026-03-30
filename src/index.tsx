import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress console output in production builds.
// console.error is preserved so genuine runtime errors still surface.
if (process.env.NODE_ENV === "production") {
  const noop = () => {};
  console.log   = noop;
  console.debug = noop;
  console.info  = noop;
  console.warn  = noop;
}

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
 <App />
  </React.StrictMode>
);
