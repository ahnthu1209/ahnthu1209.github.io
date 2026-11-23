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
  const hanger=new T.Vector3(.335,1.551,-2.565);
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

  const ambient=new T.HemisphereLight('#fff1d9','#393021',1.35);group.add(ambient);
  const key=new T.PointLight('#ffe5be',6,3);key.position.set(.40,1.73,1.13);group.add(key);
  const back=new T.PointLight('#fff2df',5,3);back.position.set(-.27,2.23,-2);group.add(back);

  function setTexture(meshMaterial,canvas){
    meshMaterial.map?.dispose();
    const map=new T.CanvasTexture(canvas);
    map.colorSpace=T.SRGBColorSpace;
    map.anisotropy=8;
    meshMaterial.map=map;
    meshMaterial.needsUpdate=true;
  }
  const pos=new T.Vector3(), aim=new T.Vector3();

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
      finish.opacity=stage==='reveal'?ease(t):0;
      line.visible=clip.visible=!pan;
      ring.visible=stage==='dip'&&t>.29;
      shell.visible=true;
      const size=isPortrait?1.18:1;
      if(pan){
        const dip=stage==='dip'?ease(bound(t/.37)):1-ease(t);
        rotor.position.copy(tray);
        rotor.position.y+=move(.235,-.014,dip);
        rotor.position.z+=move(-.045,0,dip);
        rotor.rotation.set(move(-.47,-Math.PI/2,dip),0,move(-.12,.014,dip));
        if(ring.visible){
          const waves=((t-.29)*2)%1;
          ring.scale.setScalar(.019+waves*.086);
          rippleMaterial.opacity=.16*(1-waves);
        }
        pos.set(-.024,1.407+size*.065,1.355);
        aim.set(tray.x-.04,1.025,tray.z-.012);
      } else {
        const settling=stage==='hang'?ease(bound(t/.61)):1;
        const sway=stage==='hang'?bound((t-.61)/.39):0;
        const waving=Math.sin(sway*Math.PI*3)*(1-sway)*.020;
        rotor.position.copy(hanger);
        rotor.position.y+=move(-.15,0,settling);
        rotor.position.z+=move(.16,0,settling);
        rotor.rotation.set(move(-.19,.015,settling)+waving,.016,move(-.12,.007,settling));
        const pinch=stage==='hang'?Math.sin(Math.PI*bound((t-.21)/.64)):0;
        jaws[0].rotation.x=pinch*.31;
        jaws[1].rotation.x=-pinch*.31;
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
