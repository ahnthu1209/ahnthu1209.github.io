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
  uniform sampler2D surfaceMap;
  uniform sampler2D artworkMap;
  uniform sampler2D waterMap;
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
    if (isWater) {
      vec2 p=positionInRoom.xz;
      n=normalize(n+vec3(
        .011*sin(p.x*116.+p.y*87.)+.016*sin(p.y*49.-p.x*59.),
        0.,
        .010*cos(p.y*98.-p.x*38.)+.009*cos(p.y*71.+p.x*25.)));
      vec3 sight=normalize(cameraPosition-positionInRoom);
      float fresnel=pow(1.-max(0.,dot(n,sight)),4.);
      float reflection=lampReflection(n,sight,vec3(1.24,1.70,1.27),92.);
      reflection+=lampReflection(n,sight,vec3(1.23,1.92,-.63),92.);
      reflection+=lampReflection(n,sight,vec3(1.24,2.06,-2.05),92.);
      float tile=positionInRoom.z>1.4 ? 0. : positionInRoom.z>.41 ? 1. : positionInRoom.z>-.57 ? 2. : 3.;
      float center=tile<.5 ? 1.89 : tile<1.5 ? .91 : tile<2.5 ? -.075 : -1.07;
      vec2 local=vec2((p.x-1.067)/.465+.5,(center-p.y)/.665+.5);
      vec2 sampleUV=(vec2(mod(tile,2.),floor(tile*.5))+clamp(local,0.,1.)*.96+.02)*.5;
      vec3 value=texture2D(waterMap,sampleUV).rgb;
      value=mix(value,vec3(.31,.235,.14),fresnel*.16)+vec3(.20,.15,.10)*reflection;
      gl_FragColor=vec4(value, .985);
    } else {
      vec4 sampleColor=texture2D(surfaceMap,lightUV);
      vec3 tint=mix(baseColor*.62,sampleColor.rgb,sampleColor.a);
      if (hasArtwork) {
        vec3 fine=texture2D(artworkMap,artUV).rgb;
        vec3 soft=texture2D(artworkMap,artUV,1.65).rgb;
        // Keep the print's own small lettering and film grain above the baked illumination.
        tint*=mix(vec3(1.),clamp((fine+.105)/(soft+.105),.7,1.45),.61);
      }
      gl_FragColor=vec4(tint,1.);
    }
    #include <colorspace_fragment>
  }
`;
