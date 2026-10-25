#include <cassert>
#include <cmath>
#include <iostream>
extern "C" {
int wl_overlap_aabb3d(const float*, const float*);
void wl_integrate_gravity(float*, float, float, float);
int wl_integrate_gravity_batch(float*, int, float);
}
static bool near(float a,float b){return std::fabs(a-b)<1e-5f;}
int main(){
 float first[]={0.f,0.f,0.f,32.f,32.f,32.f};
 float nearBox[]={16.f,16.f,0.f,32.f,32.f,32.f};
 float farBox[]={99.f,16.f,0.f,32.f,32.f,32.f};
 assert(wl_overlap_aabb3d(first,nearBox)==1);
 assert(wl_overlap_aabb3d(first,farBox)==0);
 float scalar[]={3.f,-1.f};
 wl_integrate_gravity(scalar,15.f,.2f,1.f/60.f);
 float batch[]={3.f,-1.f,15.f,.2f, 2.f,1.f,10.f,.4f};
 assert(wl_integrate_gravity_batch(batch,2,1.f/60.f)==2);
 assert(near(scalar[0],batch[0])&&near(scalar[1],batch[1]));
 assert(wl_integrate_gravity_batch(nullptr,2,.016f)==0);
 std::cout<<"Native physics smoke tests passed\n";
}
