#include <algorithm>
#include <cmath>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define WL_API EMSCRIPTEN_KEEPALIVE
#else
#define WL_API
#endif
extern "C" {
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
