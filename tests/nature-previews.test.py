"""Material/foliage regressions for offline GLB previews."""
import importlib.util,unittest
from pathlib import Path
import numpy as np
from PIL import Image
spec=importlib.util.spec_from_file_location('nature_previews',Path(__file__).resolve().parents[1]/'scripts/assets/render-nature-previews.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def triangle(color=(1,1,1,1),offset=0,**kwargs):
 direction=np.array([.612372,.5,.612372]);pos=np.array([[-1.,-1.,0],[1.,-1.,0],[0,1.,0]])+direction*offset
 normals=np.tile(direction,(3,1));vertices=np.column_stack((pos,normals)).reshape(-1)
 return dict(vertices=vertices,color=color,unlit=True,**kwargs)
def dominant(im):
 p=np.array(im);rgb=p[p[:,:,3]>250,:3];v,n=np.unique(rgb,axis=0,return_counts=True);return v[np.argmax(n)]
class NaturePreviewTests(unittest.TestCase):
 def test_cutout_leaves_reveal_geometry_behind_instead_of_opaque_cards(self):
  atlas=Image.new('RGBA',(2,1));atlas.putdata([(255,0,0,255),(255,0,0,0)])
  rear=triangle((0,1,0,1));front=triangle(offset=.2,image=atlas,texcoords=np.array([[.01,.1],[.99,.1],[.5,.1]]),alphaMode='MASK',alphaCutoff=.5)
  a=np.array(m.render_parts([rear,front],64));b=np.array(m.render_parts([front,rear],64));np.testing.assert_array_equal(a,b)
  self.assertGreater(np.sum((a[:,:,0]>240)&(a[:,:,1]<10)),20)
  self.assertGreater(np.sum((a[:,:,1]>240)&(a[:,:,0]<10)),20)
  self.assertEqual(a[0,0,3],0)
 def test_linear_material_colors_are_displayed_in_srgb(self):
  image=m.render_parts([triangle((.25,.5,.1,1))],64)
  expected=m.linear_to_srgb(np.array([.25,.5,.1]))*255
  np.testing.assert_allclose(dominant(image),expected,atol=1)
 def test_blended_surfaces_composite_in_depth_order_and_linear_light(self):
  rear=triangle((0,0,1,1));front=triangle((1,0,0,.5),offset=.2,alphaMode='BLEND')
  a=m.render_parts([rear,front],64);b=m.render_parts([front,rear],64);np.testing.assert_array_equal(np.array(a),np.array(b))
  np.testing.assert_allclose(dominant(a),[187,0,187],atol=2)
if __name__=='__main__':unittest.main()
