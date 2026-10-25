#include <algorithm>
#include <cmath>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define WL_API EMSCRIPTEN_KEEPALIVE
#else
#define WL_API
#endif
extern "C" {
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
