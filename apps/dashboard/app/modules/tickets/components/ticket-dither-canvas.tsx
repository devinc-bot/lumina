import { useEffect, useRef } from 'react'

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

// Smooth moving ribbon replacing the pixel-dither texture.
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_back;
uniform vec3 u_front;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float time = u_time * 0.42;
  float phase = uv.x * 5.2 - time;
  float center = 0.5 + 0.25 * sin(phase) + 0.06 * sin(uv.x * 12.0 + time * 0.65);
  float distanceToWave = abs(uv.y - center);
  float wave = 1.0 - smoothstep(0.035, 0.12, distanceToWave);
  fragColor = vec4(mix(u_back, u_front, wave), 1.0);
}`

function readHexColor(value: string): [number, number, number] | null {
  const hex = value.trim().match(/^#([\da-f]{6})$/i)?.[1]
  if (!hex) return null
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255) as [
    number,
    number,
    number,
  ]
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

export function TicketDitherCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let gl: WebGL2RenderingContext | null = null
    let program: WebGLProgram | null = null
    let buffer: WebGLBuffer | null = null
    let start = 0

    const stop = () => {
      window.cancelAnimationFrame(frame)
      frame = 0
    }

    const dispose = () => {
      stop()
      if (gl && !gl.isContextLost()) {
        if (buffer) gl.deleteBuffer(buffer)
        if (program) gl.deleteProgram(program)
      }
      buffer = null
      program = null
      gl = null
    }

    const render = (time: number) => {
      if (!gl || !program || document.hidden || motionPreference.matches) return
      if (!start) start = time
      const width = Math.max(1, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2)))
      const height = Math.max(1, Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 2)))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height)
      gl.uniform1f(gl.getUniformLocation(program, 'u_time'), (time - start) / 1000)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      canvas.style.opacity = '1'
      frame = window.requestAnimationFrame(render)
    }

    const initialize = () => {
      dispose()
      if (motionPreference.matches || document.hidden) return
      const context = canvas.getContext('webgl2', { alpha: false, antialias: false })
      if (!context) return
      const vertex = compileShader(context, context.VERTEX_SHADER, VERTEX_SHADER)
      const fragment = compileShader(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER)
      if (!vertex || !fragment) {
        if (vertex) context.deleteShader(vertex)
        if (fragment) context.deleteShader(fragment)
        return
      }
      const nextProgram = context.createProgram()
      if (!nextProgram) return
      context.attachShader(nextProgram, vertex)
      context.attachShader(nextProgram, fragment)
      context.linkProgram(nextProgram)
      context.deleteShader(vertex)
      context.deleteShader(fragment)
      if (!context.getProgramParameter(nextProgram, context.LINK_STATUS)) {
        context.deleteProgram(nextProgram)
        return
      }
      const nextBuffer = context.createBuffer()
      if (!nextBuffer) {
        context.deleteProgram(nextProgram)
        return
      }
      const styles = getComputedStyle(canvas)
      const back = readHexColor(styles.getPropertyValue('--color-ticket-preview-background'))
      const front = readHexColor(styles.getPropertyValue('--color-ticket-preview-pattern'))
      if (!back || !front) {
        context.deleteBuffer(nextBuffer)
        context.deleteProgram(nextProgram)
        return
      }
      gl = context
      program = nextProgram
      buffer = nextBuffer
      context.useProgram(program)
      context.bindBuffer(context.ARRAY_BUFFER, buffer)
      context.bufferData(
        context.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        context.STATIC_DRAW
      )
      const position = context.getAttribLocation(program, 'a_position')
      context.enableVertexAttribArray(position)
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)
      context.uniform3fv(context.getUniformLocation(program, 'u_back'), back)
      context.uniform3fv(context.getUniformLocation(program, 'u_front'), front)
      start = 0
      frame = window.requestAnimationFrame(render)
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      stop()
      canvas.style.opacity = '0'
      gl = null
      program = null
      buffer = null
    }
    const handleVisibility = () => {
      if (document.hidden) {
        stop()
      } else if (!motionPreference.matches && !frame) {
        initialize()
      }
    }
    const handleMotion = () => {
      canvas.style.opacity = '0'
      if (motionPreference.matches) dispose()
      else initialize()
    }
    const handleTheme = () => {
      if (!gl || !program) return
      const styles = getComputedStyle(canvas)
      const back = readHexColor(styles.getPropertyValue('--color-ticket-preview-background'))
      const front = readHexColor(styles.getPropertyValue('--color-ticket-preview-pattern'))
      if (!back || !front) return
      gl.useProgram(program)
      gl.uniform3fv(gl.getUniformLocation(program, 'u_back'), back)
      gl.uniform3fv(gl.getUniformLocation(program, 'u_front'), front)
    }
    const themeObserver = new MutationObserver(handleTheme)

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', initialize)
    document.addEventListener('visibilitychange', handleVisibility)
    motionPreference.addEventListener('change', handleMotion)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    initialize()

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', initialize)
      document.removeEventListener('visibilitychange', handleVisibility)
      motionPreference.removeEventListener('change', handleMotion)
      themeObserver.disconnect()
      dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full opacity-0"
    />
  )
}
