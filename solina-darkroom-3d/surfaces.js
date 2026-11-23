export const vertexShader = `
  attribute vec2 sourceUV;
  varying vec3 surface;
  varying vec3 positionInRoom;
  varying vec2 lightUV;
  varying vec2 artUV;

  void main() {
    surface = mat3(modelMatrix) * normal;
    positionInRoom = (modelMatrix * vec4(position, 1.)).xyz;
    lightUV = uv;
    artUV = sourceUV;
    gl_Position = projectionMatrix * viewMatrix * vec4(positionInRoom, 1.);
  }
`;

export const fragmentShader = `
  uniform vec3 baseColor;
  uniform bool isWater;
  uniform bool hasArtwork;
  uniform bool cleanSurface;
  uniform bool grout;
  uniform bool paperPhoto;
  uniform sampler2D surfaceMap;
  uniform sampler2D artworkMap;
  varying vec3 surface;
  varying vec3 positionInRoom;
  varying vec2 lightUV;
  varying vec2 artUV;

  float lampReflection(vec3 n, vec3 sight, vec3 lamp, float lengthwise) {
    vec3 ray = lamp-positionInRoom;
    vec3 direction = normalize(ray);
    vec3 halfVector = normalize(direction+sight);
    return pow(max(.0,dot(n,halfVector)),lengthwise)/(1.+dot(ray,ray));
  }

  void main() {
    vec3 n = normalize(surface) * (gl_FrontFacing ? 1. : -1.);
    if (paperPhoto) {
      vec3 photo=texture2D(artworkMap,artUV).rgb;
      gl_FragColor=vec4(photo*vec3(.847,.768,.631),1.);
    } else if (isWater) {
      vec2 p=positionInRoom.xz;
      n=normalize(n+vec3(
        .008*sin(p.x*51.+p.y*25.),
        0.,
        .007*sin(p.y*47.-p.x*21.)));
      vec3 sight=normalize(cameraPosition-positionInRoom);
      float fresnel=pow(1.-clamp(dot(n,sight),0.,1.),4.);
      float reflection=lampReflection(n,sight,vec3(1.24,1.70,1.27),155.);
      reflection+=lampReflection(n,sight,vec3(1.23,1.92,-.63),155.);
      reflection+=lampReflection(n,sight,vec3(1.24,2.06,-2.05),155.);
      vec3 clearTint=vec3(.31,.36,.38);
      vec3 lightTint=vec3(.87,.77,.58);
      float highlight=clamp(reflection*1.18,0.,.8);
      float opacity=.045+.36*fresnel+.60*highlight;
      gl_FragColor=vec4(mix(clearTint,lightTint,highlight),clamp(opacity,.045,.78));
    } else {
      vec4 sampleColor=texture2D(surfaceMap,lightUV);
      vec3 tint=mix(baseColor*.62,sampleColor.rgb,sampleColor.a);
      if (cleanSurface) {
        vec4 blurred=texture2D(surfaceMap,lightUV,2.35);
        vec3 local=mix(tint,blurred.rgb,blurred.a*.66);
        tint=mix(tint,max(tint,local*.92),.78);
        tint=mix(tint,local,.28);
        if(grout) tint=max(tint,baseColor*.78);
      }
      if (hasArtwork) {
        vec3 printColor=texture2D(artworkMap,artUV).rgb;
        tint*=pow(clamp(printColor/.78, .0, 1.29),vec3(.82));
      }
      gl_FragColor=vec4(tint,1.);
    }
    #include <colorspace_fragment>
  }
`;
