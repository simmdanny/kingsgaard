import sys
from PIL import Image, ImageDraw, ImageFont
B,A,out=sys.argv[1],sys.argv[2],sys.argv[3];rows=sys.argv[4].split(',')
titles=dict(x.split('=') for x in sys.argv[5].split('|'))
W,H=900,506;pad=44
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',24);fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
except: f=fs=ImageFont.load_default()
S=Image.new('RGB',(W*2+12,len(rows)*(H+pad)+10),(24,24,28));d=ImageDraw.Draw(S)
for i,r in enumerate(rows):
    y=i*(H+pad)+pad
    d.text((8,y-34),titles.get(r,r),fill=(240,236,226),font=f)
    for j,(src,lab) in enumerate([(B,'BEFORE'),(A,'AFTER')]):
        im=Image.open(f'{src}/{r}.png').convert('RGB').resize((W,H));S.paste(im,(j*(W+12),y))
        d.rectangle([j*(W+12)+8,y+8,j*(W+12)+128,y+40],fill=(0,0,0));d.text((j*(W+12)+16,y+12),lab,fill=(255,220,120),font=fs)
S.save(out,quality=86);print(S.size)
