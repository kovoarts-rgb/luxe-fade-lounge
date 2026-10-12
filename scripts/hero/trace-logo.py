from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import base64, io, re, json, math

root = Path(__file__).resolve().parents[2]
svg = (root/'assets/logo.svg').read_text()
raw = base64.b64decode(re.search(r'data:image/jpeg;base64,([^"\s]+)', svg).group(1))
image = Image.open(io.BytesIO(raw)).convert('L').crop((145,443,445,685))
image = image.resize((900,726),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.5))
mask = np.array(image)>135
edges = {}
def add(a,b): edges.setdefault(a,[]).append(b)
height,width = mask.shape
for y,x in zip(*np.nonzero(mask)):
    x,y=int(x),int(y)
    if y==0 or not mask[y-1,x]: add((x,y),(x+1,y))
    if x==width-1 or not mask[y,x+1]: add((x+1,y),(x+1,y+1))
    if y==height-1 or not mask[y+1,x]: add((x+1,y+1),(x,y+1))
    if x==0 or not mask[y,x-1]: add((x,y+1),(x,y))

def area(points):
    return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1]))/2
def distance(p,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1]
    if dx==dy==0: return math.hypot(p[0]-a[0],p[1]-a[1])
    t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)))
    return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
def rdp(points,eps=.7):
    if len(points)<3: return points
    distances=[distance(p,points[0],points[-1]) for p in points[1:-1]]
    k=1+int(np.argmax(distances))
    if distances[k-1]<=eps: return [points[0],points[-1]]
    return rdp(points[:k+1],eps)[:-1]+rdp(points[k:],eps)
def simplify(points):
    k=max(range(len(points)),key=lambda i:math.hypot(points[i][0]-points[0][0],points[i][1]-points[0][1]))
    return rdp(points[:k+1])[:-1]+rdp(points[k:]+[points[0]])[:-1]
def contains(poly,p):
    inside=False
    for a,b in zip(poly,poly[1:]+poly[:1]):
        if (a[1]>p[1])!=(b[1]>p[1]) and p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]: inside=not inside
    return inside

loops=[]
while edges:
    start=next(iter(edges)); current=start; previous=None; points=[]
    for _ in range(50000):
        points.append(current)
        options=edges[current]
        if previous is None or len(options)==1: nxt=options[0]
        else:
            incoming=(current[0]-previous[0],current[1]-previous[1])
            def turn(p):
                v=(p[0]-current[0],p[1]-current[1])
                return math.atan2(incoming[0]*v[1]-incoming[1]*v[0],incoming[0]*v[0]+incoming[1]*v[1])
            nxt=max(options,key=turn)
        options.remove(nxt)
        if not options: del edges[current]
        previous,current=current,nxt
        if current==start: break
    else: raise RuntimeError('Unclosed logo contour')
    if abs(area(points))>=12: loops.append(simplify(points))

outers=[{'outline':p,'holes':[]} for p in loops if area(p)>0]
for hole in [p for p in loops if area(p)<0]:
    candidates=[s for s in outers if contains(s['outline'],hole[0])]
    assert candidates,'Unassigned letter counter'
    min(candidates,key=lambda s:abs(area(s['outline'])))['holes'].append(hole)
def convert(points): return [[round((x/3-150)/100,5),round((121-y/3)/100,5)] for x,y in points]
result=[{'outline':convert(s['outline']),'holes':[convert(p) for p in s['holes']]} for s in outers]
(Path(__file__).parent/'logo-contours.json').write_text(json.dumps(result,separators=(',',':')))
print('Traced original supplied logo:',len(result),'components,',sum(len(s['holes']) for s in result),'letter counters.')
print('Total boundary vertices:',sum(len(s['outline'])+sum(map(len,s['holes'])) for s in result))
