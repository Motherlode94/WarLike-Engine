#include <algorithm>
#include <cmath>
#include <cstdint>
#include <queue>
#include <vector>

// WarLike native C++17 pathfinder. C ABI is stable for browser WebAssembly calls.
// Rectangle data: packed x,y,width,height float arrays.
// Return: number of coordinate pairs; -1 means insufficient output buffer.
extern "C" {
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define WL_API EMSCRIPTEN_KEEPALIVE
#else
#define WL_API
#endif
WL_API int wl_find_path(float startX,float startY,float goalX,float goalY,
                        const float* rects,int rectCount,float cellSize,float padding,
                        int maxNodes,float* output,int outputCapacity) {
 if (!std::isfinite(startX)||!std::isfinite(startY)||!std::isfinite(goalX)||!std::isfinite(goalY)||!output||outputCapacity<2||rectCount<0||rectCount>10000||maxNodes<=0) return 0;
 const float cell=std::clamp(cellSize,16.f,128.f),pad=std::max(0.f,padding);
 const int sx=(int)std::floor(startX/cell),sy=(int)std::floor(startY/cell);
 const int gx=(int)std::floor(goalX/cell),gy=(int)std::floor(goalY/cell);
 const int minX=std::min(sx,gx)-16,minY=std::min(sy,gy)-16;
 const int width=std::abs(gx-sx)+33,height=std::abs(gy-sy)+33;
 if(width>1024||height>1024||((long long)width*height)>250000)return 0;
 const int total=width*height;
 auto index=[&](int x,int y){return (y-minY)*width+x-minX;};
 const int start=index(sx,sy),goal=index(gx,gy);
 std::vector<uint8_t> walls(total,0);
 if(rects)for(int i=0;i<rectCount;i++){
   const float* r=rects+4*i;
   if(!std::isfinite(r[0])||!std::isfinite(r[1])||!std::isfinite(r[2])||!std::isfinite(r[3])||r[2]<=0||r[3]<=0)continue;
   int left=std::max(minX,(int)std::floor((r[0]-pad)/cell));
   int right=std::min(minX+width-1,(int)std::floor((r[0]+r[2]+pad-.001f)/cell));
   int top=std::max(minY,(int)std::floor((r[1]-pad)/cell));
   int bottom=std::min(minY+height-1,(int)std::floor((r[1]+r[3]+pad-.001f)/cell));
   for(int y=top;y<=bottom;y++)for(int x=left;x<=right;x++)walls[index(x,y)]=1;
 }
 walls[start]=0;walls[goal]=0;
 const int inf=1000000000;
 std::vector<int> cost(total,inf),parent(total,-1);
 using Node=std::pair<int,int>;std::priority_queue<Node,std::vector<Node>,std::greater<Node>> open;
 auto h=[&](int x,int y){return std::abs(x-gx)+std::abs(y-gy);};
 cost[start]=0;open.push({h(sx,sy),start});
 int visited=0;
 while(!open.empty()&&visited++<std::min(maxNodes,12000)){
   const auto [score,at]=open.top();open.pop();
   int x=minX+at%width,y=minY+at/width;
   if(score!=cost[at]+h(x,y))continue;
   if(at==goal){
     std::vector<int> route;
     for(int v=goal;v!=-1;v=parent[v])route.push_back(v);
     std::reverse(route.begin(),route.end());
     int n=(int)route.size()-1+1;
     if(n*2>outputCapacity)return -1;
     int out=0;
     for(size_t i=1;i<route.size();i++){
       int v=route[i];output[out++]=(minX+v%width+.5f)*cell;output[out++]=(minY+v/width+.5f)*cell;
     }
     output[out++]=goalX;output[out++]=goalY;
     return out/2;
   }
   for(auto [dx,dy]:{std::pair<int,int>{1,0},{-1,0},{0,1},{0,-1}}){
     int xx=x+dx,yy=y+dy;
     if(xx<minX||xx>=minX+width||yy<minY||yy>=minY+height)continue;
     int next=index(xx,yy),newCost=cost[at]+1;
     if(walls[next]||newCost>=cost[next])continue;
     cost[next]=newCost;parent[next]=at;open.push({newCost+h(xx,yy),next});
   }
 }
 return 0;
}
}
