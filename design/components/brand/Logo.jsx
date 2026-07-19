import React from "react";

export function Logo({ variant = "lockup", height = 48, theme = "auto", assetBase = "../../assets/logo", style, ...rest }) {
  let dark = theme === "dark";
  if (theme === "auto" && typeof document !== "undefined") {
    dark = document.documentElement.getAttribute("data-theme") !== "light";
  }
  const src = `${assetBase}/${variant}${dark ? "-dark" : ""}.png`;
  return <img src={src} alt={variant === "mark" ? "DigiResiThon mark" : "DigiResiThon"} style={{ height, width: "auto", display: "block", imageRendering: "auto", ...style }} {...rest} />;
}
