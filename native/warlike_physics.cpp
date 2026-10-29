#include <algorithm>
#include <cmath>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define WL_API EMSCRIPTEN_KEEPALIVE
#else
#define WL_API
#endif
extern "C" {
// Segments and boxes use scene pixels: X/Z ground plane, then elevation.
// One segment = [fromX,fromZ,fromHeight,toX,toZ,toHeight].
// One box = [x,z,height,width,depth,sizeY]. Hits = [boxIndex,fraction].
// First equal-distance box wins, matching the JavaScript scene query.
// Returns segment count, or -1 for an invalid request (no output is written).
WL_API int wl_segment_aabb3d_batch(const float* segments,int segmentCount,
                                  const float* boxes,int boxCount,float* hits) {
 if(segmentCount<0||segmentCount>4096||boxCount<0||boxCount>100000||
    static_cast<long long>(segmentCount)*boxCount>20000000)return -1;
 if(segmentCount==0)return 0;
 if(!segments||!hits||(boxCount>0&&!boxes))return -1;
 // Validate the entire request before touching caller-owned output.
 for(int i=0;i<segmentCount*6;i++)if(!std::isfinite(segments[i]))return -1;
 for(int i=0;i<segmentCount;i++)for(int axis=0;axis<3;axis++)
  if(!std::isfinite(segments[6*i+axis+3]-segments[6*i+axis]))return -1;
 for(int i=0;i<boxCount;i++){
  const float* box=boxes+6*i;
  for(int axis=0;axis<6;axis++)if(!std::isfinite(box[axis]))return -1;
  for(int axis=0;axis<3;axis++)if(box[axis+3]<=0||!std::isfinite(box[axis]+box[axis+3]))return -1;
 }
 for(int i=0;i<segmentCount;i++){
  const float* segment=segments+6*i;
  int closest=-1;float fraction=2.f;
  for(int j=0;j<boxCount;j++){
   const float* box=boxes+6*j;
   float near=0.f,far=1.f;bool intersects=true;
   for(int axis=0;axis<3;axis++){
    const float start=segment[axis],delta=segment[axis+3]-start;
    const float low=box[axis],high=box[axis]+box[axis+3];
    if(std::abs(delta)<1e-8f){if(start<low||start>high){intersects=false;break;}continue;}
    const float a=(low-start)/delta,b=(high-start)/delta;
    near=std::max(near,std::min(a,b));far=std::min(far,std::max(a,b));
    if(near>far){intersects=false;break;}
   }
   if(intersects&&near<fraction){closest=j;fraction=near;}
  }
  hits[2*i]=static_cast<float>(closest);
  hits[2*i+1]=closest<0?-1.f:fraction;
 }
 return segmentCount;
}

// Forward declaration required by the batched integrator below.
WL_API void wl_integrate_gravity(float* inOut,float gravity,float restitution,float delta);
// Packed boxes: x, z, elevation, width, depth, height (height uses scene pixel units).
WL_API int wl_overlap_aabb3d(const float* a,const float* b) {
 if(!a||!b)return 0;
 for(int i=0;i<6;i++)if(!std::isfinite(a[i])||!std::isfinite(b[i]))return 0;
 if(a[3]<=0||a[4]<=0||a[5]<=0||b[3]<=0||b[4]<=0||b[5]<=0)return 0;
 return a[0]<b[0]+b[3]&&a[0]+a[3]>b[0]&&a[1]<b[1]+b[4]&&a[1]+a[4]>b[1]&&a[2]<b[2]+b[5]/64.f&&a[2]+a[5]/64.f>b[2];
}

// Batch integration reduces JS↔WASM transitions for large scenes.
// Each body occupies [height, velocityY, gravity, restitution] (4 floats).
WL_API int wl_integrate_gravity_batch(float* bodies,int count,float delta) {
 if(!bodies||count<0||count>100000||!std::isfinite(delta))return 0;
 for(int i=0;i<count;i++){
  float* body=bodies+4*i;
  if(!std::isfinite(body[0])||!std::isfinite(body[1])||!std::isfinite(body[2])||!std::isfinite(body[3]))continue;
  wl_integrate_gravity(body,body[2],body[3],delta);
 }
 return count;
}

// Integrates vertical velocity and ground contact for one 3D rigidbody.
// inOut[0]=height, [1]=vertical velocity; all measurements use WarLike units.
WL_API void wl_integrate_gravity(float* inOut,float gravity,float restitution,float delta) {
 if(!inOut||!std::isfinite(inOut[0])||!std::isfinite(inOut[1])||!std::isfinite(delta))return;
 const float dt=std::clamp(delta,0.f,.05f);
 const float g=std::max(0.f,std::isfinite(gravity)?gravity:15.f);
 const float bounce=std::clamp(std::isfinite(restitution)?restitution:0.f,0.f,1.f);
 float vy=inOut[1]-g*dt;
 float y=std::max(0.f,inOut[0]+vy*dt);
 if(y==0.f)vy=std::abs(vy)>1.f?-vy*bounce:0.f;
 inOut[0]=y;inOut[1]=vy;
}
}
