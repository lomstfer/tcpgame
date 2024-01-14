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