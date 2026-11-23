const ease=t=>t*t*(3-2*t);
const bound=t=>Math.max(0,Math.min(1,t));
const move=(a,b,t)=>a+(b-a)*t;

export function createPrintScene(T,scene) {
  const group=new T.Group();
  group.visible=false;
  scene.add(group);
  const make=(geo,mat,parent=group)=>{
    const m=new T.Mesh(geo,mat);parent.add(m);return m;
  };
  const tray=new T.Vector3(1.065,.972,.906);
  const hanger=new T.Vector3(.335,1.538,-2.565);
  const length=.345;
  const rotor=new T.Group();
  group.add(rotor);
  const shell=make(new T.BoxGeometry(length,length,.002),new T.MeshStandardMaterial({color:'#ede3d2',roughness:.69}),rotor);
  const sheet=new T.MeshBasicMaterial({color:'#e7ddcb',side:T.DoubleSide});
  const postcard=make(new T.PlaneGeometry(length-.009,length-.009),sheet,rotor);
  postcard.position.z=.0014;
  const finish=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide,opacity:0,transparent:true,depthWrite:false});
  const reveal=make(new T.PlaneGeometry(length-.009,length-.009),finish,rotor);
  reveal.position.z=.0027;
  reveal.renderOrder=1;
  const wood=new T.MeshStandardMaterial({color:'#a87748',roughness:.52});
  const brass=new T.MeshStandardMaterial({color:'#b99c66',roughness:.36,metalness:.45});
  const line=make(new T.CylinderGeometry(.0021,.0021,2.48,12),brass);
  line.position.set(0,hanger.y+length/2+.014,hanger.z-.01);
  line.rotation.z=Math.PI/2;
  const clip=new T.Group();group.add(clip);
  clip.position.set(hanger.x,hanger.y+length/2+.014,hanger.z+.013);
  const jaws=[-1,1].map(sign=>{
    const pivot=new T.Group();clip.add(pivot);pivot.position.z=sign*.005;
    const jaw=make(new T.BoxGeometry(.018,.063,.008),wood,pivot);
    jaw.position.y=-.007;
    return pivot;
  });
  const spring=make(new T.TorusGeometry(.0078,.00125,8,20),brass,clip);
  spring.rotation.y=Math.PI/2;
  const rippleMaterial=new T.MeshBasicMaterial({color:'#e9d4ab',transparent:true,opacity:.17,depthWrite:false,side:T.DoubleSide});
  const ring=make(new T.RingGeometry(.90,1,64),rippleMaterial);
  ring.rotation.x=-Math.PI/2;ring.position.set(tray.x+.095,tray.y+.0015,tray.z-.06);
  ring.renderOrder=2;

  const texture=new T.CanvasTexture(gloveTexture());
  const glove=new T.MeshStandardMaterial({color:'#212122',roughness:.51,metalness:.06,bumpMap:texture,bumpScale:.00075});
  const seam=new T.MeshStandardMaterial({color:'#1b1b1d',roughness:.67});
  const blackSleeve=new T.MeshStandardMaterial({color:'#22201f',roughness:.94,bumpMap:texture,bumpScale:.00032});
  const hand=makeHand(glove,seam,blackSleeve);
  const support=makeHand(glove,seam,blackSleeve);
  support.scale.setScalar(.92);
  support.scale.y*=-1;

  const ambient=new T.HemisphereLight('#fff1d9','#393021',1.35);group.add(ambient);
  const key=new T.PointLight('#ffe5be',6,3);key.position.set(.40,1.73,1.13);group.add(key);
  const back=new T.PointLight('#fff2df',5,3);back.position.set(-.27,2.23,-2);group.add(back);

  function makeHand(material,edge,sleeve){
    const root=new T.Group();
    group.add(root);
    function skin(sections,mat=material){return make(tube(T,sections),mat,root);}
    // X runs from the pinch to the wrist. The thumb meets the index at the paper.
    skin([[.366,-.006,-.004,.038,.038],[.309,-.003,-.003,.034,.033],[.208,0,-.002,.024,.021],[.150,0,0,.025,.019]],sleeve);
    skin([[.224,0,0,.027,.022],[.198,0,0,.026,.019],[.150,.005,0,.027,.017],[.114,.009,0,.037,.019],[.083,.011,.001,.040,.019],[.065,.012,.004,.034,.014],[.059,.01,.003,.019,.01]]);
    skin([[.211,0,0,.026,.021],[.204,0,0,.028,.022],[.194,0,0,.026,.020]],edge);
    skin([[.096,.035,.006,.012,.013],[.067,.039,.006,.012,.012],[.041,.035,.014,.010,.010],[.019,.021,.018,.009,.009],[.005,.007,.014,.008,.007],[.001,.002,.011,.002,.002]]);
    skin([[.100,.013,.009,.013,.013],[.067,.015,.009,.012,.012],[.045,.010,.020,.010,.010],[.031,.000,.031,.009,.009],[.032,-.011,.033,.007,.007],[.037,-.014,.031,.002,.002]]);
    skin([[.102,-.009,.009,.012,.012],[.073,-.010,.010,.011,.011],[.053,-.014,.018,.010,.010],[.044,-.022,.026,.008,.008],[.047,-.029,.026,.006,.006],[.051,-.030,.024,.002,.002]]);
    skin([[.107,-.025,.007,.010,.010],[.087,-.031,.009,.009,.009],[.072,-.038,.015,.008,.008],[.067,-.042,.025,.007,.007],[.074,-.047,.026,.003,.004]]);
    skin([[.153,.031,-.002,.019,.017],[.127,.054,-.006,.017,.015],[.103,.070,-.013,.015,.013],[.078,.063,-.017,.011,.010],[.050,.044,-.014,.010,.009],[.023,.023,-.010,.009,.007],[.006,.005,-.010,.007,.006],[.001,.000,-.008,.002,.002]]);
    return root;
  }

  function setTexture(meshMaterial,canvas){
    meshMaterial.map?.dispose();
    const map=new T.CanvasTexture(canvas);
    map.colorSpace=T.SRGBColorSpace;
    map.anisotropy=8;
    meshMaterial.map=map;
    meshMaterial.needsUpdate=true;
  }
  const grip=new T.Vector3();
  const local=new T.Vector3(length*.318,length*.5-.006,0);
  const pos=new T.Vector3(), aim=new T.Vector3();

  function placeHand(offset,roll,twist=0){
    rotor.updateMatrix();
    grip.copy(local).applyMatrix4(rotor.matrix);
    hand.position.copy(grip).add(offset);
    hand.rotation.set(rotor.rotation.x+twist,rotor.rotation.y,roll,'ZYX');
  }

  const zero=new T.Vector3();
  const liftAway=new T.Vector3();
  return {
    start(ghost){
      setTexture(sheet,ghost);
      sheet.color.set('#f4e6d0');
      finish.opacity=0;
      group.visible=true;
    },
    finish(canvas){group.visible=true;setTexture(finish,canvas);},
    hide(){group.visible=false;},
    frame(stage,t,camera,isPortrait){
      group.visible=true;
      const pan=stage==='dip'||stage==='lift';
      line.visible=clip.visible=!pan;
      ring.visible=stage==='dip'&&t>.29;
      support.visible=false;
      hand.visible=true;
      shell.visible=true;
      const size=isPortrait?1.18:1;
      if(pan){
        const dip=stage==='dip'?ease(bound(t/.37)):1-ease(t);
        rotor.position.copy(tray);
        rotor.position.y+=move(.235,-.014,dip);
        rotor.position.z+=move(-.045,0,dip);
        rotor.rotation.set(move(-.47,-Math.PI/2,dip),0,move(-.12,.014,dip));
        placeHand(zero,move(.38,.26,dip),.10);
        if(ring.visible){
          const waves=((t-.29)*2)%1;
          ring.scale.setScalar(.019+waves*.086);
          rippleMaterial.opacity=.16*(1-waves);
        }
        pos.set(-.024,1.407+size*.065,1.355);
        aim.set(tray.x-.04,1.025,tray.z-.012);
      } else {
        const settling=stage==='hang'?ease(bound(t/.61)):1;
        const waving=stage==='hang'?0:Math.sin(t*8)*Math.max(0,1-t)*.012;
        rotor.position.copy(hanger);
        rotor.position.y+=move(-.15,0,settling);
        rotor.position.z+=move(.16,0,settling);
        rotor.rotation.set(move(-.19,.015,settling)+waving,.016,move(-.12,.007,settling));
        const pulling=stage==='hang'?ease(bound((t-.66)/.34)):1;
        hand.visible=pulling<.99;
        liftAway.set(.06*pulling,.12*pulling,.18*pulling);
        placeHand(liftAway,.33);
        const pinch=stage==='hang'?Math.sin(Math.PI*bound((t-.21)/.64)):0;
        jaws[0].rotation.x=pinch*.31;
        jaws[1].rotation.x=-pinch*.31;
        support.visible=stage==='hang'&&t>.10&&t<.94;
        support.position.copy(clip.position).add(liftAway.set(-.004,.006+Math.abs(t-.56)*.13,.005+Math.abs(t-.56)*.20));
        support.rotation.set(.28,-.15,1.45);
        finish.opacity=stage==='reveal'?ease(t):0;
        pos.set(-.055,1.635,-1.33+((stage==='reveal'?t:0)*-.13)+(isPortrait?.28:0));
        aim.set(hanger.x-.09,1.61,hanger.z);
      }
      camera.position.copy(pos);
      camera.fov=pan?(isPortrait?62:48):(isPortrait?54:43);
      camera.updateProjectionMatrix();
      camera.lookAt(aim);
    },
  };
}

function gloveTexture(){
  const canvas=Object.assign(document.createElement('canvas'),{width:128,height:128});
  const p=canvas.getContext('2d');
  p.fillStyle='#838383';p.fillRect(0,0,128,128);
  for(let i=0;i<115;i++){
    const x=(i*53)%128,y=(i*39)%128;
    p.strokeStyle=i%2?'#969696':'#6e6e6e';
    p.beginPath();p.moveTo(x,y);p.quadraticCurveTo(x+5,y-2,x+9,y+2);p.stroke();
  }
  return canvas;
}

function tube(T,sections) {
  const spline=new T.CatmullRomCurve3(sections.map(a=>new T.Vector3(...a.slice(0,3))));
  const rings=40,sides=18,xyz=[],uv=[],indices=[];
  const tangent=new T.Vector3(), across=new T.Vector3(), depth=new T.Vector3(), point=new T.Vector3();
  const reference=new T.Vector3(0,0,1);
  for(let j=0;j<=rings;j++){
    const time=j/rings;
    const piece=time*(sections.length-1), i=Math.min(sections.length-2,Math.floor(piece));
    const ry=move(sections[i][3],sections[i+1][3],piece-i);
    const rz=move(sections[i][4],sections[i+1][4],piece-i);
    spline.getPoint(time,point);spline.getTangent(time,tangent);
    across.crossVectors(reference,tangent).normalize();
    depth.crossVectors(tangent,across).normalize();
    for(let k=0;k<=sides;k++){
      const phase=k/sides*Math.PI*2;
      const a=Math.cos(phase)*ry,b=Math.sin(phase)*rz;
      xyz.push(point.x+across.x*a+depth.x*b,point.y+across.y*a+depth.y*b,point.z+across.z*a+depth.z*b);
      uv.push(time,k/sides);
      if(j<rings&&k<sides){
        const index=j*(sides+1)+k;
        indices.push(index,index+1,index+sides+1,index+1,index+sides+2,index+sides+1);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
