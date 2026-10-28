"""Import original FBX/OBJ geometry, skins, clips and materials using Blender."""
import bpy,json,sys,gc,traceback,struct
from pathlib import Path
jobsPath=Path(sys.argv[sys.argv.index('--')+1]);jobs=json.loads(jobsPath.read_text());results=[];imageIndexes={}
for i,job in enumerate(jobs):
 try:
  target=Path(job['target']);target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists() and target.stat().st_size>100:
   data=target.read_bytes();document=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
   if not document.get('animations') and not job.get('skin'):continue
  bpy.ops.wm.read_factory_settings(use_empty=True)
  source=Path(job['source']);folder=Path(job['folder'])
  if source.suffix.lower()=='.fbx':bpy.ops.import_scene.fbx(filepath=str(source),use_anim=True,use_image_search=True)
  else:bpy.ops.wm.obj_import(filepath=str(source))
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.polygons)]
  if not meshes:raise ValueError('No mesh geometry: animation-only or empty source file')
  if job.get('skin'):
   original=set(bpy.context.scene.objects);rig=next(o for o in original if o.type=='ARMATURE');actions=[]
   for animation in job['animations']:
    before=set(bpy.data.actions);bpy.ops.import_scene.fbx(filepath=animation,use_anim=True)
    for action in set(bpy.data.actions)-before:action.name=Path(animation).stem;action.use_fake_user=True;actions.append(action)
    for obj in set(bpy.context.scene.objects)-original:bpy.data.objects.remove(obj,do_unlink=True)
   rig.animation_data_create()
   if actions:rig.animation_data.action=actions[0]
   image=bpy.data.images.load(job['skin'],check_existing=True)
   for mesh in meshes:
    material=bpy.data.materials.new('Kenney original skin');material.use_nodes=True;nodes=material.node_tree.nodes;shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');texture=nodes.new('ShaderNodeTexImage');texture.image=image;material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color']);shader.inputs['Roughness'].default_value=.8;mesh.data.materials.clear();mesh.data.materials.append(material)
  if str(folder) not in imageIndexes:
   index={}
   for path in folder.rglob('*'):
    if path.suffix.lower() in ['.png','.jpg','.jpeg']:index.setdefault(path.name.lower(),[]).append(path)
   imageIndexes[str(folder)]=index
  for image in bpy.data.images:
   if image.source!='FILE':continue
   if not image.has_data:
    name=Path(image.filepath.replace('\\','/')).name.lower();choices=imageIndexes[str(folder)].get(name,[])
    if choices:image.filepath=str(min(choices,key=lambda p:len(str(p))));image.reload()
   if image.has_data and max(image.size)>1024:
    scale=1024/max(image.size);image.scale(max(1,round(image.size[0]*scale)),max(1,round(image.size[1]*scale)));image.pack()
  # FBX import leaves unused actions with an unset id_root in Blender 4.2.
  # Set their actual target type so every original take is exported.
  for action in bpy.data.actions:action.id_root='OBJECT';action.use_fake_user=True
  bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_skins=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_yup=True,export_normals=True)
  results.append({'id':job['id'],'converted':source.suffix.lower()})
 except Exception as error:results.append({'id':job['id'],'error':str(error),'file':str(Path(job['source']).relative_to(job['folder']))});print('FAILED',job['id'],str(error),flush=True)
 if i%20==0:print('CONVERT',i+1,'/',len(jobs),flush=True);gc.collect()
jobsPath.with_name(jobsPath.stem.replace('jobs','results')+'.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('CONVERSION COMPLETE',len(jobs),'jobs',sum('error' in a for a in results),'errors',flush=True)
