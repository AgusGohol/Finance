# Membuat ikon aplikasi (web, iPhone, Android). Dijalankan sekali; hasilnya ikut disimpan di repo.
from PIL import Image, ImageDraw, ImageFont
import os
TEAL=(11,107,94,255); WHITE=(255,255,255,255); FONT="/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"

def glyph(draw, cx, cy, size):
    f=ImageFont.truetype(FONT, int(size))
    draw.text((cx,cy),"Rp",font=f,fill=WHITE,anchor="mm")

def square(n, radius_ratio=0.0, text_ratio=0.42, circle=False, bg=TEAL, transparent=False, scale=4):
    N=n*scale; im=Image.new("RGBA",(N,N),(0,0,0,0)); d=ImageDraw.Draw(im)
    if not transparent:
        if circle: d.ellipse((0,0,N-1,N-1),fill=bg)
        else: d.rounded_rectangle((0,0,N-1,N-1),radius=int(N*radius_ratio),fill=bg)
    glyph(d,N/2,N/2+N*0.01,N*text_ratio)
    return im.resize((n,n),Image.LANCZOS)

def save(im,p): os.makedirs(os.path.dirname(p),exist_ok=True); im.save(p,optimize=True)

# Web / iPhone
save(square(192,0.22),"src/icons/icon-192.png")
save(square(512,0.22),"src/icons/icon-512.png")
save(square(512,0,0.30),"src/icons/icon-maskable-512.png")
save(square(180,0,0.40),"src/icons/apple-touch-icon.png")

# Android launcher
R="resources/android/res"
for dens,s in {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}.items():
    save(square(s,0.22),f"{R}/mipmap-{dens}/ic_launcher.png")
    save(square(s,circle=True),f"{R}/mipmap-{dens}/ic_launcher_round.png")
    fg=int(s*2.25)  # 108dp kanvas, area aman 66dp
    save(square(fg,text_ratio=0.26,transparent=True),f"{R}/mipmap-{dens}/ic_launcher_foreground.png")

# Splash (layar pembuka)
def splash(w,h,scale=2):
    W,H=w*scale,h*scale; im=Image.new("RGBA",(W,H),TEAL); d=ImageDraw.Draw(im)
    m=min(W,H); glyph(d,W/2,H/2-m*0.04,m*0.16)
    f=ImageFont.truetype(FONT,int(m*0.055)); d.text((W/2,H/2+m*0.12),"Kas Pribadi",font=f,fill=(255,255,255,210),anchor="mm")
    return im.resize((w,h),Image.LANCZOS).convert("RGB")
sizes={"drawable":(480,320),"drawable-land-mdpi":(480,320),"drawable-land-hdpi":(800,480),"drawable-land-xhdpi":(1280,720),
 "drawable-land-xxhdpi":(1600,960),"drawable-land-xxxhdpi":(1920,1280),"drawable-port-mdpi":(320,480),"drawable-port-hdpi":(480,800),
 "drawable-port-xhdpi":(720,1280),"drawable-port-xxhdpi":(960,1600),"drawable-port-xxxhdpi":(1280,1920)}
for folder,(w,h) in sizes.items(): save(splash(w,h),f"{R}/{folder}/splash.png")
print("ikon selesai")
