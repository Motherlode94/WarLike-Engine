// Experimental WebGPU preview shader. Not active in the production WebGL renderer.
// Intentionally unlit: validates geometry transform, viewport matrix and vertex colors.
// Replace with a tested PBR pipeline before claiming Unity-style material fidelity.
struct Uniforms {
  model: mat4x4<f32>,
  view_proj: mat4x4<f32>,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) color: vec4<f32>,
};
struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) color: vec4<f32>,
};
@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.clip_position = uniforms.view_proj * uniforms.model * vec4<f32>(input.position, 1.0);
  output.color = input.color;
  return output;
}
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  return input.color;
}
