"""Depth/UV regression checks for the real-model thumbnail rasterizer."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np
from PIL import Image
spec=importlib.util.spec_from_file_location('mesh_thumbnail',Path(__file__).resolve().parents[1]/'scripts/assets/mesh-thumbnail.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ThumbnailDepthTests(unittest.TestCase):
 def test_crossing_triangles_use_pixel_depth_independent_of_draw_order(self):
  xy=np.array([[1.,1.],[30.,1.],[1.,30.]]*2)
  depth=np.array([0.,2.,0.,1.03,1.03,1.03]);uv=np.array([[.1,.1]]*3+[[.9,.1]]*3)
  faces=np.array([[0,1,2],[3,4,5]]);atlas=Image.new('RGB',(2,1));atlas.putdata([(255,0,0),(0,255,0)])
  first=np.array(module.rasterize(xy,depth,uv,faces,atlas,[1.,1.],32))
  reverse=np.array(module.rasterize(xy,depth,uv,faces[::-1],atlas,[1.,1.],32))
  np.testing.assert_array_equal(first,reverse)
  np.testing.assert_array_equal(first[3,3],[0,255,0,255])
  np.testing.assert_array_equal(first[3,23],[255,0,0,255])
  self.assertEqual(first[31,31,3],0)
 def test_texture_coordinates_interpolate_across_each_face(self):
  xy=np.array([[1.,1.],[30.,1.],[1.,30.]]);uv=np.array([[.01,.1],[.99,.1],[.01,.1]])
  atlas=Image.new('RGB',(2,1));atlas.putdata([(255,0,0),(0,255,0)])
  image=np.array(module.rasterize(xy,np.ones(3),uv,np.array([[0,1,2]]),atlas,[1.],32))
  np.testing.assert_array_equal(image[3,3],[255,0,0,255])
  np.testing.assert_array_equal(image[3,23],[0,255,0,255])
if __name__=='__main__':unittest.main()
