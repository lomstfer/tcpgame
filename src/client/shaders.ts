import { Filter } from "pixi.js"

export const gridFragShader = `
    precision highp float;

    varying vec2 vTextureCoord;
    
    uniform vec4 inputSize;
    uniform vec4 outputFrame;

    uniform vec2 uSize;
    uniform vec2 uWorldPosition;
    uniform float uGridSquareSize;

    void main(void) {
        vec2 worldPos = vTextureCoord * inputSize.xy / outputFrame.zw * uSize + uWorldPosition;
                    
        vec3 grid = vec3(1.0, 1.0, 1.0);
        vec4 color = vec4(0.0);

        vec2 b = worldPos / uGridSquareSize;
        
        float t = 0.0;
        float lineSize = 0.06;
        float alpha = 0.5;
        
        float xx = abs(b.x - floor(0.5 + b.x));
        float yy = abs(b.y - floor(0.5 + b.y));
        if (xx < lineSize) {
            if (yy < xx) {                    
                t += ((lineSize - yy) / lineSize);
            }
            else {                    
                t += ((lineSize - xx) / lineSize);
            }
        }
        else if (yy < lineSize) {
            if (xx < yy) {                    
                t += ((lineSize - xx) / lineSize);
            }
            else {                    
                t += ((lineSize - yy) / lineSize);
            }
        }

        color = vec4(0.0, 0.0, 0.0, t * alpha);
        // if (t != 0.0) {
        //     color.x += (sin(b.y / 5.0) + 1.0) * 0.5;
        //     // color.y += (cos(b.x / 5.0) + 1.0) * 0.5;
        //     // color.z += cos(b.x / 5.0);
        // }
        
        gl_FragColor = color;
    }
`

export const outlineShader = `
    precision highp float;

    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;

    uniform vec4 inputSize;
    uniform vec4 outputFrame;

    void main(void) {
        vec2 pos = vTextureCoord * inputSize.xy / outputFrame.zw * vec2(8.0, 8.0);

        vec4 color = texture2D(uSampler, vTextureCoord);
        if (color.a != 0.0) {
            vec2 pos01 = pos / 8.0;
            if (floor(pos.x) == 0.0 || floor(pos.x) == 7.0 || 
                floor(pos.y) == 0.0 || floor(pos.y) == 7.0
            ) {
                color.r = 1.0;
            }
            else if (
                texture2D(uSampler, vec2(pos01.x - 1.0/inputSize.x, pos01.y)).a == 0.0 ||
                texture2D(uSampler, vec2(pos01.x + 1.0/inputSize.x, pos01.y)).a == 0.0 ||
                texture2D(uSampler, vec2(pos01.x, pos01.y - 1.0/inputSize.y)).a == 0.0 ||
                texture2D(uSampler, vec2(pos01.x, pos01.y + 1.0/inputSize.y)).a == 0.0
            ) {
                color.g = 1.0;
            }
        }
        
        gl_FragColor = color;
    }
`

export const stateShader = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;


uniform float uTime;

void main(void) {
    vec2 position = (projectionMatrix * vec3(aVertexPosition, 1.0)).xy;

    vec2 displacement = vec2(sin(uTime + aVertexPosition.x), sin(uTime + aVertexPosition.y)) * 0.01;
    position += displacement;

    gl_Position = vec4(position, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}
`
export const stateFilter = new Filter(stateShader)

export const shapeFragShader = `
precision highp float;

uniform sampler2D uSampler;
varying vec2 vTextureCoord;

uniform vec4 inputSize;
uniform vec4 outputFrame;

uniform bool spreadOut;

float remap(float value, float from1, float to1, float from2,  float to2) {
    return (value - from1) / (to1 - from1) * (to2 - from2) + from2;
}

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    vec4 c = texture2D(uSampler, vec2(0.5, 0.5));
    
    vec2 pos = vTextureCoord * inputSize.xy / outputFrame.zw - vec2(0.5);

    if (spreadOut) {
        color = c;
    }
    else 
    {
    }
    
    gl_FragColor = color;
}
`