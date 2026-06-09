import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 309 267"
        width="32"
        height="32"
      >
        <g fill="none" fillRule="evenodd">
          <path
            d="M186 38 H236 C268 38 290 58 290 92 V174 C290 208 268 229 236 229 H186 V204 H231 C247 204 261 193 261 174 V92 C261 73 247 62 231 62 H186 Z"
            fill="#F28A5C"
          />
          <path
            d="M118 38 H137 L223 229 H194 L170 174 H113 L123 151 H160 L128 78 L74 229 H47 Z"
            fill="#000"
          />
          <path d="M127 112 L145 151 H111 Z" fill="transparent" />
          <rect x="108" y="145" width="63" height="12" fill="#000" />
        </g>
      </svg>
    ),
    {
      width: 32,
      height: 32,
    },
  );
}
