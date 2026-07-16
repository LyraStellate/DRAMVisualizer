// One program for everything: instanced rounded rectangles with an inner
// border and a flash tint. Positions arrive as camera-relative CSS pixels
// (origin = screen center) — never absolute world coordinates (DESIGN.md §5.2).

export const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_unit;      // unit quad vertex
layout(location = 1) in vec2 a_pos;       // rect origin, camera-relative CSS px
layout(location = 2) in vec2 a_size;      // rect size, CSS px
layout(location = 3) in vec4 a_fill;      // u8x4 normalized
layout(location = 4) in vec4 a_border;    // alpha 0 = no border
layout(location = 5) in float a_borderPx;
layout(location = 6) in float a_cornerPx;
layout(location = 7) in float a_flash;    // access-flash intensity, 0..1

uniform vec2 u_viewportPx;                // CSS px

out vec2 v_local;
flat out vec2 v_sizePx;
flat out vec4 v_fill;
flat out vec4 v_border;
flat out float v_borderPx;
flat out float v_cornerPx;
flat out float v_flash;

void main() {
  vec2 px = a_pos + a_unit * a_size;      // origin = screen center
  vec2 clip = px / (u_viewportPx * 0.5) * vec2(1.0, -1.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_local = a_unit * a_size;
  v_sizePx = a_size;
  v_fill = a_fill;
  v_border = a_border;
  v_borderPx = a_borderPx;
  v_cornerPx = a_cornerPx;
  v_flash = a_flash;
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_local;
flat in vec2 v_sizePx;
flat in vec4 v_fill;
flat in vec4 v_border;
flat in float v_borderPx;
flat in float v_cornerPx;
flat in float v_flash;

out vec4 outColor;

const vec3 FLASH_COLOR = vec3(0.22, 0.85, 0.40);

void main() {
  vec2 hs = v_sizePx * 0.5;
  vec2 p = v_local - hs;
  float r = min(v_cornerPx, min(hs.x, hs.y));
  vec2 q = abs(p) - (hs - vec2(r));
  // Signed distance of a rounded rectangle, in px (negative = inside).
  float d = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;

  vec4 color = v_fill;
  if (v_borderPx > 0.0 && v_border.a > 0.0) {
    float t = smoothstep(-v_borderPx - 0.5, -v_borderPx + 0.5, d);
    color = mix(color, v_border, t);
  }

  float f = v_flash;
  if (f > 0.001) {
    color.rgb = mix(color.rgb, FLASH_COLOR, f) + FLASH_COLOR * f * 0.35; // additive glow
    color.a = max(color.a, min(1.0, f + 0.2));
  }

  float aa = 1.0 - smoothstep(-0.5, 0.5, d);
  float alpha = color.a * aa;
  outColor = vec4(color.rgb * alpha, alpha); // premultiplied
}
`;
