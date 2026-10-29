#include <cassert>
#include <cmath>
#include <iostream>
#include <limits>
extern "C" {
int wl_overlap_aabb3d(const float*, const float*);
void wl_integrate_gravity(float*, float, float, float);
int wl_integrate_gravity_batch(float*, int, float);
int wl_segment_aabb3d_batch(const float*,int,const float*,int,float*);
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
 const float boxes[]={80.f,-2.f,-2.f,1.f,4.f,4.f, 50.f,-2.f,-2.f,1.f,4.f,4.f};
 const float segments[]={0.f,0.f,0.f,100.f,0.f,0.f, 0.f,20.f,0.f,100.f,20.f,0.f,
                         50.f,0.f,0.f,50.f,0.f,0.f, 100.f,0.f,0.f,0.f,0.f,0.f};
 float hits[8]={};
 assert(wl_segment_aabb3d_batch(segments,4,boxes,2,hits)==4);
 assert(hits[0]==1.f&&near(hits[1],.5f)); // nearest box, not input order
 assert(hits[2]==-1.f&&hits[3]==-1.f); // parallel miss
 assert(hits[4]==1.f&&hits[5]==0.f); // starts inside, zero-length segment
 assert(hits[6]==0.f&&near(hits[7],.19f)); // negative direction
 const float duplicate[]={50.f,-2.f,-2.f,1.f,4.f,4.f,50.f,-2.f,-2.f,1.f,4.f,4.f};
 assert(wl_segment_aabb3d_batch(segments,1,duplicate,2,hits)==1&&hits[0]==0.f);
 assert(wl_segment_aabb3d_batch(segments,1,nullptr,0,hits)==1&&hits[0]==-1.f);
 assert(wl_segment_aabb3d_batch(nullptr,0,nullptr,0,nullptr)==0);
 assert(wl_segment_aabb3d_batch(segments,4097,boxes,2,hits)==-1);
 assert(wl_segment_aabb3d_batch(segments,1,boxes,100001,hits)==-1);
 float bad[]={0.f,0.f,0.f,1.f,1.f,std::numeric_limits<float>::quiet_NaN()};
 hits[0]=123.f;hits[1]=456.f;
 assert(wl_segment_aabb3d_batch(bad,1,boxes,2,hits)==-1&&hits[0]==123.f&&hits[1]==456.f);
 const float overflow[]={-3e38f,0.f,0.f,3e38f,0.f,0.f};
 assert(wl_segment_aabb3d_batch(overflow,1,boxes,2,hits)==-1);
 std::cout<<"Native physics smoke tests passed\n";
}
