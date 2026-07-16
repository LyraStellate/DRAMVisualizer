// WebGL2 renderer: one program, one instanced draw per frame. All authoritative
// state lives on the CPU, so context loss recovery is just "recompile + redraw".

import { InstanceWriter, STRIDE_BYTES } from "./InstanceWriter";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export class GLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private quadVbo: WebGLBuffer | null = null;
  private instanceVbo: WebGLBuffer | null = null;
  private viewportLoc: WebGLUniformLocation | null = null;
  private instanceVboCapacity = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private onContextRestored: () => void
  ) {}

  init(): boolean {
    this.canvas.addEventListener("webglcontextlost", this.handleLost);
    this.canvas.addEventListener("webglcontextrestored", this.handleRestored);
    this.gl = this.canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      premultipliedAlpha: true,
    });
    if (!this.gl) return false;
    this.setup();
    return true;
  }

  // preventDefault keeps the context restorable (webglcontextrestored fires).
  private handleLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleRestored = (): void => {
    this.setup();
    this.onContextRestored();
  };

  private setup(): void {
    const gl = this.gl;
    if (!gl) return;
    const compile = (type: number, src: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }
    this.program = program;
    this.viewportLoc = gl.getUniformLocation(program, "u_viewportPx");

    // Static unit quad (TRIANGLE_STRIP order).
    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    this.instanceVbo = gl.createBuffer();
    this.instanceVboCapacity = 0;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVbo);
    const float = (loc: number, size: number, offset: number) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE_BYTES, offset);
      gl.vertexAttribDivisor(loc, 1);
    };
    const color = (loc: number, offset: number) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(
        loc,
        4,
        gl.UNSIGNED_BYTE,
        true,
        STRIDE_BYTES,
        offset
      );
      gl.vertexAttribDivisor(loc, 1);
    };
    float(1, 2, 0); // a_pos
    float(2, 2, 8); // a_size
    color(3, 16); // a_fill
    color(4, 20); // a_border
    float(5, 1, 24); // a_borderPx
    float(6, 1, 28); // a_cornerPx
    float(7, 1, 32); // a_flash

    gl.bindVertexArray(null);
  }

  get isContextLost(): boolean {
    return !this.gl || this.gl.isContextLost();
  }

  draw(
    writer: InstanceWriter,
    viewportW: number,
    viewportH: number,
    dpr: number
  ): void {
    const gl = this.gl;
    if (!gl || gl.isContextLost() || !this.program || !this.vao) return;

    const pxW = Math.max(1, Math.round(viewportW * dpr));
    const pxH = Math.max(1, Math.round(viewportH * dpr));
    if (this.canvas.width !== pxW) this.canvas.width = pxW;
    if (this.canvas.height !== pxH) this.canvas.height = pxH;

    gl.viewport(0, 0, pxW, pxH);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha
    gl.clearColor(0.976, 0.976, 0.98, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (writer.count === 0) return;

    gl.useProgram(this.program);
    gl.uniform2f(this.viewportLoc, viewportW, viewportH);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVbo);
    if (writer.grew || writer.buffer.byteLength > this.instanceVboCapacity) {
      gl.bufferData(gl.ARRAY_BUFFER, writer.buffer, gl.DYNAMIC_DRAW);
      this.instanceVboCapacity = writer.buffer.byteLength;
    } else {
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        new Uint8Array(writer.buffer, 0, writer.bytesUsed)
      );
    }
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, writer.count);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.handleRestored
    );
    const gl = this.gl;
    if (gl && !gl.isContextLost()) {
      if (this.program) gl.deleteProgram(this.program);
      if (this.quadVbo) gl.deleteBuffer(this.quadVbo);
      if (this.instanceVbo) gl.deleteBuffer(this.instanceVbo);
      if (this.vao) gl.deleteVertexArray(this.vao);
    }
    this.gl = null;
  }
}
