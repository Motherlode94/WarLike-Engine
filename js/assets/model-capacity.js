// Conservative browser budgets for high-detail Meshy / glTF models.
// Do not bypass GLB validation or silently drop embedded materials.
export const MAX_IMPORTED_GLB_BYTES=64*1024*1024;
export const MAX_SCENE_MODEL_BYTES=256*1024*1024;
export const MAX_MODEL_BASE64_LENGTH=Math.ceil(MAX_IMPORTED_GLB_BYTES/3)*4;
export const humanModelSize=n=>(n/(1024*1024)).toFixed(0)+' Mo';
